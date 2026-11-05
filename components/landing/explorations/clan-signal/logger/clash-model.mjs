/* eslint-disable no-unused-vars, unicorn/no-new-array -- Retain the authoritative SC3D decoder and its array allocation semantics verbatim. */
// Extracted from ClashKing Assets SC3D viewer; retained decoder and skinning contracts.
import * as THREE from 'three';
import {decodeContinuousPackedAnimation as decodeContinuousPackedAnimationData,readContinuousPackedBases,resolveAliasedRotationTransform,resolveAnimationLocalTransform,resolveAnimationSourceName,requiresAnimationGlobalRemap} from './animation-codec.mjs';
import {decodeNormalizedWeightVector} from './weight-codec.mjs';
const state={smoothShading:true,wireframe:false};
const meshColor=()=>0xffffff;
const FBT = {
  NULL: 0,
  INT: 1,
  UINT: 2,
  FLOAT: 3,
  KEY: 4,
  STRING: 5,
  INDIRECT_INT: 6,
  INDIRECT_UINT: 7,
  INDIRECT_FLOAT: 8,
  MAP: 9,
  VECTOR: 10,
  VECTOR_INT: 11,
  VECTOR_UINT: 12,
  VECTOR_FLOAT: 13,
  VECTOR_KEY: 14,
  VECTOR_INT2: 16,
  VECTOR_UINT2: 17,
  VECTOR_FLOAT2: 18,
  VECTOR_INT3: 19,
  VECTOR_UINT3: 20,
  VECTOR_FLOAT3: 21,
  VECTOR_INT4: 22,
  VECTOR_UINT4: 23,
  VECTOR_FLOAT4: 24,
  BLOB: 25,
  BOOL: 26,
  VECTOR_BOOL: 36
};

class FlatTableReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u8(pos) {
    return this.view.getUint8(pos);
  }

  u16(pos) {
    return this.view.getUint16(pos, true);
  }

  i32(pos) {
    return this.view.getInt32(pos, true);
  }

  u32(pos) {
    return this.view.getUint32(pos, true);
  }

  f32(pos) {
    return this.view.getFloat32(pos, true);
  }

  rootTable() {
    return this.u32(0);
  }

  fieldPos(table, field) {
    const vtable = table - this.i32(table);
    const vtableLength = this.u16(vtable);
    const fieldOffsetPos = vtable + 4 + field * 2;
    if (fieldOffsetPos + 2 > vtable + vtableLength) return 0;
    const offset = this.u16(fieldOffsetPos);
    return offset === 0 ? 0 : table + offset;
  }

  u32Field(table, field, fallback = 0) {
    const pos = this.fieldPos(table, field);
    return pos ? this.u32(pos) : fallback;
  }

  offsetDest(table, field) {
    const pos = this.fieldPos(table, field);
    return pos ? pos + this.u32(pos) : 0;
  }

  stringField(table, field) {
    const dest = this.offsetDest(table, field);
    return dest ? this.stringAt(dest) : "";
  }

  bytesField(table, field) {
    const dest = this.offsetDest(table, field);
    if (!dest) return new Uint8Array();
    const length = this.u32(dest);
    return this.bytes.slice(dest + 4, dest + 4 + length);
  }

  floatVectorField(table, field) {
    const dest = this.offsetDest(table, field);
    if (!dest) return [];
    const count = this.u32(dest);
    const values = [];
    for (let i = 0; i < count; i += 1) {
      values.push(this.f32(dest + 4 + i * 4));
    }
    return values;
  }

  stringAt(pos) {
    const length = this.u32(pos);
    const bytes = this.bytes.slice(pos + 4, pos + 4 + length);
    return new TextDecoder().decode(bytes);
  }

  vectorTables(table, field) {
    const dest = this.offsetDest(table, field);
    if (!dest) return [];
    const count = this.u32(dest);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const elem = dest + 4 + i * 4;
      out.push(elem + this.u32(elem));
    }
    return out;
  }

  vectorU32Field(table, field) {
    const dest = this.offsetDest(table, field);
    if (!dest) return [];
    const count = this.u32(dest);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      out.push(this.u32(dest + 4 + i * 4));
    }
    return out;
  }
}

class FlexReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.text = new TextDecoder();
  }

  u(pos, width) {
    if (width === 1) return this.view.getUint8(pos);
    if (width === 2) return this.view.getUint16(pos, true);
    if (width === 4) return this.view.getUint32(pos, true);
    return Number(this.view.getBigUint64(pos, true));
  }

  i(pos, width) {
    if (width === 1) return this.view.getInt8(pos);
    if (width === 2) return this.view.getInt16(pos, true);
    if (width === 4) return this.view.getInt32(pos, true);
    return Number(this.view.getBigInt64(pos, true));
  }

  f(pos, width) {
    if (width === 4) return this.view.getFloat32(pos, true);
    if (width === 8) return this.view.getFloat64(pos, true);
    return this.i(pos, width);
  }

  indirect(pos, parentWidth) {
    return pos - this.u(pos, parentWidth);
  }

  root() {
    if (this.bytes.length < 2) return null;
    const parentWidth = this.bytes[this.bytes.length - 1];
    const packedType = this.bytes[this.bytes.length - 2];
    return this.value(this.bytes.length - 2 - parentWidth, parentWidth, packedType);
  }

  value(pos, parentWidth, packedType) {
    const byteWidth = 1 << (packedType & 3);
    const type = packedType >> 2;
    if (type === FBT.NULL) return null;
    if (type === FBT.INT) return this.i(pos, parentWidth);
    if (type === FBT.UINT || type === FBT.BOOL) return type === FBT.BOOL ? this.u(pos, parentWidth) !== 0 : this.u(pos, parentWidth);
    if (type === FBT.FLOAT) return this.f(pos, parentWidth);
    if (type === FBT.INDIRECT_INT) return this.i(this.indirect(pos, parentWidth), byteWidth);
    if (type === FBT.INDIRECT_UINT) return this.u(this.indirect(pos, parentWidth), byteWidth);
    if (type === FBT.INDIRECT_FLOAT) return this.f(this.indirect(pos, parentWidth), byteWidth);
    if (type === FBT.STRING) return this.stringAt(this.indirect(pos, parentWidth), byteWidth);
    if (type === FBT.KEY) return this.keyAt(this.indirect(pos, parentWidth));
    if (type === FBT.MAP) return this.mapAt(this.indirect(pos, parentWidth), byteWidth);
    if (type === FBT.VECTOR) return this.vectorAt(this.indirect(pos, parentWidth), byteWidth);
    if (type >= FBT.VECTOR_INT && type <= FBT.VECTOR_FLOAT) return this.typedVectorAt(this.indirect(pos, parentWidth), byteWidth, type - FBT.VECTOR_INT + FBT.INT);
    if (type >= FBT.VECTOR_INT2 && type <= FBT.VECTOR_FLOAT4) {
      const fixed = type - FBT.VECTOR_INT2;
      const length = Math.floor(fixed / 3) + 2;
      const elementType = (fixed % 3) + FBT.INT;
      return this.fixedVectorAt(this.indirect(pos, parentWidth), byteWidth, elementType, length);
    }
    if (type === FBT.BLOB) return this.blobAt(this.indirect(pos, parentWidth), byteWidth);
    if (type === FBT.VECTOR_BOOL) return this.typedVectorAt(this.indirect(pos, parentWidth), byteWidth, FBT.BOOL);
    return null;
  }

  stringAt(pos, width) {
    const length = this.u(pos - width, width);
    return this.text.decode(this.bytes.slice(pos, pos + length));
  }

  keyAt(pos) {
    let end = pos;
    while (end < this.bytes.length && this.bytes[end] !== 0) end += 1;
    return this.text.decode(this.bytes.slice(pos, end));
  }

  blobAt(pos, width) {
    const length = this.u(pos - width, width);
    return this.bytes.slice(pos, pos + length);
  }

  vectorAt(pos, width) {
    const length = this.u(pos - width, width);
    const out = [];
    const typePos = pos + length * width;
    for (let i = 0; i < length; i += 1) {
      out.push(this.value(pos + i * width, width, this.bytes[typePos + i]));
    }
    return out;
  }

  typedVectorAt(pos, width, elementType) {
    const length = this.u(pos - width, width);
    return this.fixedVectorAt(pos, width, elementType, length);
  }

  fixedVectorAt(pos, width, elementType, length) {
    const out = [];
    const packed = (elementType << 2) | Math.log2(width);
    for (let i = 0; i < length; i += 1) out.push(this.value(pos + i * width, width, packed));
    return out;
  }

  mapAt(pos, width) {
    const length = this.u(pos - width, width);
    const keysOffsetPos = pos - width * 3;
    const keysPos = this.indirect(keysOffsetPos, width);
    const keysWidth = this.u(keysOffsetPos + width, width);
    const out = {};
    const typePos = pos + length * width;
    for (let i = 0; i < length; i += 1) {
      const keyRefPos = keysPos + i * keysWidth;
      const key = this.keyAt(this.indirect(keyRefPos, keysWidth));
      out[key] = this.value(pos + i * width, width, this.bytes[typePos + i]);
    }
    return out;
  }
}

function parseGLB(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB file");
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);

  const chunks = {};
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, true);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    chunks[type] = bytes.slice(offset + 8, offset + 8 + length);
    offset += 8 + length;
  }
  if (!chunks.FLA2 || !chunks["BIN\u0000"]) throw new Error("expected FLA2 and BIN chunks");
  return decodeFLA2(chunks.FLA2, chunks["BIN\u0000"]);
}

function decodeFLA2(fla2, bin) {
  const fb = new FlatTableReader(fla2);
  const root = fb.rootTable();
  const accessors = fb.vectorTables(root, 0).map((table) => ({
    bufferView: fb.u32Field(table, 0, 0),
    byteOffset: fb.u32Field(table, 1, 0),
    componentType: fb.u32Field(table, 2, 5123),
    count: fb.u32Field(table, 3, 0)
  }));
  const bufferViews = fb.vectorTables(root, 3).map((table) => ({
    buffer: fb.u32Field(table, 0, 0),
    byteLength: fb.u32Field(table, 1, 0),
    byteOffset: fb.u32Field(table, 2, 0)
  }));
  const meshes = fb.vectorTables(root, 12).map((table) => ({
    primitives: fb.vectorTables(table, 3).map((primitive) => ({
      indices: fb.u32Field(primitive, 3, 0),
      material: fb.u32Field(primitive, 4, 0)
    }))
  }));
  const skins = fb.vectorTables(root, 17).map((table) => ({
    inverseBindMatrices: fb.fieldPos(table, 2) ? fb.u32Field(table, 2, null) : null,
    joints: fb.vectorU32Field(table, 3)
  }));
  const nodes = fb.vectorTables(root, 13).map((table, index) => {
    const nodeExtension = decodeNodeExtension(fb.bytesField(table, 2));
    return {
      index,
      parent: nodeExtension && Number.isFinite(nodeExtension.parent) ? nodeExtension.parent : null,
      mesh: fb.fieldPos(table, 5) ? fb.u32Field(table, 5, 0) : null,
      name: fb.stringField(table, 6),
      rotation: vectorOrDefault(fb.floatVectorField(table, 7), [0, 0, 0, 1]),
      scale: vectorOrDefault(fb.floatVectorField(table, 8), [1, 1, 1]),
      skin: fb.fieldPos(table, 9) ? fb.u32Field(table, 9, null) : null,
      translation: vectorOrDefault(fb.floatVectorField(table, 10), [0, 0, 0])
    };
  });

  const extensionBytes = fb.bytesField(root, 6);
  const extensionRoot = extensionBytes.length ? new FlexReader(extensionBytes).root() : null;
  const extension = extensionRoot && extensionRoot.SC_odin_format ? extensionRoot.SC_odin_format : null;
  const materials = extension && extension.materials ? extension.materials : [];
  const extensionSummary = extension ? summarizeOdinExtension(extension) : null;
  if (!extension || !extension.meshDataInfos || !extension.meshDataInfos.length) {
    return {
      positions: new Float32Array(),
      vertexCount: 0,
      renderMeshes: [],
      meshCount: meshes.length,
      nodeCount: nodes.length,
      accessorCount: accessors.length,
      materialCount: extension && extension.materials ? extension.materials.length : 0,
      materials,
      extensionSummary,
      nodes,
      globals: computeGlobalMatrices(nodes),
      globalsByName: globalMatricesByName(nodes),
      nodesByName: nodesByName(nodes),
      inverseBindMatrices: [],
      jointNodes: [],
      skins: [],
      defaultSkin: null,
      weightedCount: 0,
      animation: decodeAnimation(extension && extension.animation, bin, accessors, bufferViews, nodes)
    };
  }
  const streams = extension.meshDataInfos.map((meshInfo, index) => decodeVertexStream(meshInfo, index, bin, bufferViews, extension.bufferView));
  if (!streams.length) throw new Error("missing mesh vertex streams");
  const indexView = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);

  const renderMeshes = [];
  const meshNodes = nodes.filter((node) => node.mesh !== null && node.mesh < meshes.length);
  for (const node of meshNodes) {
    const mesh = meshes[node.mesh];
    for (const primitive of mesh.primitives) {
      const accessor = accessors[primitive.indices];
      if (!accessor) continue;
      const accessorView = bufferViews[accessor.bufferView] || { byteOffset: 0 };
      const indexOffset = accessorView.byteOffset + accessor.byteOffset;
      const indices = readIndices(indexView, indexOffset, accessor);
      const streamIndex = chooseVertexStream(accessor, accessorView, indices, streams);
      renderMeshes.push({
        name: node.name || `mesh_${node.mesh}`,
        nodeIndex: node.index,
        mesh: node.mesh,
        skinIndex: Number.isInteger(node.skin) ? node.skin : null,
        material: primitive.material,
        streamIndex,
        indices,
        renderIndex: renderMeshes.length
      });
    }
  }

  const decodedSkins = skins.map((skin, index) => {
    const jointNodes = skin.joints.map((nodeIndex) => nodes[nodeIndex]).filter(Boolean);
    const inverseBindMatrices = readInverseBindMatrices(bin, accessors, bufferViews, jointNodes.length, skin.inverseBindMatrices);
    return { index, jointNodes, inverseBindMatrices };
  });
  const defaultSkin = decodedSkins.find((skin) => skin.jointNodes.length) || { index: null, jointNodes: [], inverseBindMatrices: [] };
  const jointNodes = defaultSkin.jointNodes;
  const inverseBindMatrices = defaultSkin.inverseBindMatrices;
  const globals = computeGlobalMatrices(nodes);

  const weightedCount = streams.reduce((total, stream) => total + countWeightedVertices(stream.boneWeights), 0);
  const vertexCount = streams.reduce((total, stream) => total + stream.vertexCount, 0);
  const animation = decodeAnimation(extension.animation, bin, accessors, bufferViews, nodes);
  const firstStream = streams[0];

  return {
    positions: firstStream.positions,
    uvs: firstStream.uvs,
    boneIndices: firstStream.boneIndices,
    boneWeights: firstStream.boneWeights,
    streams,
    vertexCount,
    renderMeshes,
    meshCount: meshes.length,
    nodeCount: nodes.length,
    accessorCount: accessors.length,
    materialCount: extension.materials ? extension.materials.length : 0,
    materials,
    extensionSummary,
    nodes,
    globals,
    globalsByName: globalMatricesByName(nodes, globals),
    nodesByName: nodesByName(nodes),
    inverseBindMatrices,
    jointNodes,
    skins: decodedSkins,
    defaultSkin,
    weightedCount,
    animation
  };
}

function decodeNodeExtension(bytes) {
  if (!bytes.length) return null;
  try {
    const root = new FlexReader(bytes).root();
    return root && root.SC_odin_format ? root.SC_odin_format : null;
  } catch (error) {
    return null;
  }
}

function summarizeOdinExtension(extension) {
  return {
    keys: Object.keys(extension),
    bufferView: extension.bufferView,
    materials: (extension.materials || []).map((material, index) => ({
      index,
      keys: Object.keys(material),
      name: material.name || "",
      shader: material.shader || "",
      blendMode: material.blendMode,
      variables: material.variables || null,
      constants: material.constants || null
    })),
    meshDataInfos: (extension.meshDataInfos || []).map((meshInfo, index) => ({
      index,
      keys: Object.keys(meshInfo),
      vertexDescriptorCount: meshInfo.vertexDescriptors ? meshInfo.vertexDescriptors.length : 0,
      vertexDescriptors: (meshInfo.vertexDescriptors || []).map((descriptor) => ({
        keys: Object.keys(descriptor),
        offset: descriptor.offset,
        stride: descriptor.stride,
        attributes: (descriptor.attributes || []).map((attribute) => ({
          keys: Object.keys(attribute),
          name: attribute.name,
          offset: attribute.offset,
          format: attribute.format
        }))
      }))
    }))
  };
}

function vectorOrDefault(values, fallback) {
  return values.length ? values : fallback;
}

function findVertexAttribute(descriptors, name) {
  for (const descriptor of descriptors) {
    const attribute = descriptor.attributes ? descriptor.attributes.find((attr) => attr.name === name) : null;
    if (attribute) return { descriptor, attribute };
  }
  return null;
}

function decodeVertexStream(meshInfo, streamIndex, bin, bufferViews, bufferViewIndex) {
  const descriptors = [...meshInfo.vertexDescriptors].sort((a, b) => a.offset - b.offset);
  const positionSource = findVertexAttribute(descriptors, "a_pos");
  if (!positionSource) throw new Error("missing a_pos vertex descriptor");
  const positionDescriptor = positionSource.descriptor;
  const positionAttribute = positionSource.attribute;
  const nextDescriptor = descriptors.find((descriptor) => descriptor.offset > positionDescriptor.offset);
  const bufferView = bufferViews[bufferViewIndex == null ? 0 : bufferViewIndex] || { byteOffset: 0, byteLength: bin.byteLength };
  const vertexStreamEnd = nextDescriptor ? nextDescriptor.offset : bufferView.byteLength;
  const vertexCount = Math.floor((vertexStreamEnd - positionDescriptor.offset) / positionDescriptor.stride);
  const positions = readPositions(bin, bufferView.byteOffset + positionDescriptor.offset, vertexCount, positionDescriptor.stride, positionAttribute.offset);
  const uvSource = findVertexAttribute(descriptors, "a_uv0");
  const uvs = uvSource
    ? readUVs(bin, bufferView.byteOffset + uvSource.descriptor.offset, vertexCount, uvSource.descriptor.stride, uvSource.attribute.offset)
    : new Float32Array(vertexCount * 2);
  const normalSource = findVertexAttribute(descriptors, "a_normal");
  const normals = normalSource
    ? readNormals(bin, bufferView.byteOffset + normalSource.descriptor.offset, vertexCount, normalSource.descriptor.stride, normalSource.attribute.offset)
    : null;
  const boneSource = findVertexAttribute(descriptors, "a_boneindex");
  const weightSource = findVertexAttribute(descriptors, "a_boneweights");
  const hasNormalizedWeightVector = Boolean(weightSource && weightSource.attribute.format === 36);
  const boneIndices = boneSource
    ? readU8x4(bin, bufferView.byteOffset + boneSource.descriptor.offset, vertexCount, boneSource.descriptor.stride, boneSource.attribute.offset)
    : new Uint8Array(vertexCount * 4);
  const rawBoneWeights = weightSource
    ? readU8x4(bin, bufferView.byteOffset + weightSource.descriptor.offset, vertexCount, weightSource.descriptor.stride, weightSource.attribute.offset)
    : new Uint8Array(vertexCount * 4);
  const normalizedWeights = hasNormalizedWeightVector
    ? readNormalizedWeightVectors(bin, bufferView.byteOffset + weightSource.descriptor.offset, vertexCount, weightSource.descriptor.stride, weightSource.attribute.offset)
    : null;
  const boneWeights = normalizedWeights
    ? normalizedWeights.weights
    : rawBoneWeights.slice();
  const weightRepairStats = normalizedWeights
    ? normalizedWeights.stats
    : repairBoneWeights(boneIndices, boneWeights, Boolean(boneSource && weightSource), false);

  return {
    index: streamIndex,
    minOffset: bufferView.byteOffset + Math.min(...descriptors.map((descriptor) => descriptor.offset)),
    vertexCount,
    positions,
    uvs,
    normals,
    boneIndices,
    rawBoneWeights,
    boneWeights,
    weightRepairStats
  };
}

function readIndices(view, offset, accessor) {
  if (accessor.componentType === 5125) {
    const indices = new Uint32Array(accessor.count);
    for (let i = 0; i < accessor.count; i += 1) {
      indices[i] = view.getUint32(offset + i * 4, true);
    }
    return indices;
  }
  const indices = new Uint16Array(accessor.count);
  for (let i = 0; i < accessor.count; i += 1) {
    indices[i] = view.getUint16(offset + i * 2, true);
  }
  return indices;
}

function chooseVertexStream(accessor, accessorView, indices, streams) {
  const indexElementSize = accessor.componentType === 5125 ? 4 : 2;
  const indexEnd = accessorView.byteOffset + accessor.byteOffset + accessor.count * indexElementSize;
  let maxIndex = 0;
  for (let i = 0; i < indices.length; i += 1) maxIndex = Math.max(maxIndex, indices[i]);

  const byOffset = streams
    .filter((stream) => maxIndex < stream.vertexCount && indexEnd <= stream.minOffset + 16)
    .sort((a, b) => a.minOffset - b.minOffset)[0];
  if (byOffset) return byOffset.index;

  const byRange = streams.find((stream) => maxIndex < stream.vertexCount);
  return byRange ? byRange.index : 0;
}

function readPositions(bin, baseOffset, vertexCount, stride, attributeOffset) {
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i += 1) {
    const src = baseOffset + i * stride + attributeOffset;
    positions[i * 3] = view.getFloat32(src, true);
    positions[i * 3 + 1] = view.getFloat32(src + 4, true);
    positions[i * 3 + 2] = view.getFloat32(src + 8, true);
  }
  return positions;
}

function readUVs(bin, baseOffset, vertexCount, stride, attributeOffset) {
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const uvs = new Float32Array(vertexCount * 2);
  for (let i = 0; i < vertexCount; i += 1) {
    const src = baseOffset + i * stride + attributeOffset;
    uvs[i * 2] = Math.max(-1, view.getInt16(src, true) / 32767);
    uvs[i * 2 + 1] = Math.max(-1, view.getInt16(src + 2, true) / 32767);
  }
  return uvs;
}

function readNormals(bin, baseOffset, vertexCount, stride, attributeOffset) {
  const normals = new Float32Array(vertexCount * 3);
  const vector = new THREE.Vector3();
  for (let i = 0; i < vertexCount; i += 1) {
    const src = baseOffset + i * stride + attributeOffset;
    vector.set(
      snorm8(bin[src]),
      snorm8(bin[src + 1]),
      snorm8(bin[src + 2])
    ).normalize();
    normals[i * 3] = vector.x;
    normals[i * 3 + 1] = vector.y;
    normals[i * 3 + 2] = vector.z;
  }
  return normals;
}

function snorm8(value) {
  const signed = value > 127 ? value - 256 : value;
  return Math.max(-1, signed / 127);
}

function readU8x4(bin, baseOffset, vertexCount, stride, attributeOffset) {
  const values = new Uint8Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i += 1) {
    const src = baseOffset + i * stride + attributeOffset;
    values[i * 4] = bin[src];
    values[i * 4 + 1] = bin[src + 1];
    values[i * 4 + 2] = bin[src + 2];
    values[i * 4 + 3] = bin[src + 3];
  }
  return values;
}

function readNormalizedWeightVectors(bin, baseOffset, vertexCount, stride, attributeOffset) {
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const weights = new Float32Array(vertexCount * 4);
  const stats = {
    vertexCount,
    normalizedWeightVector: vertexCount,
    invalidNormalizedWeightVector: 0
  };

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const src = baseOffset + vertex * stride + attributeOffset;
    const packed = view.getUint32(src, true);
    const offset = vertex * 4;
    if (!decodeNormalizedWeightVector(packed, weights, offset)) stats.invalidNormalizedWeightVector += 1;
  }

  return { weights, stats };
}

function repairBoneWeights(indices, weights, hasSkinAttributes, hasImplicitFirstWeight) {
  const stats = {
    vertexCount: weights.length / 4,
    implicitFirstWeight: 0,
    invalidImplicitFirstWeight: 0,
    zeroWeightFallback: 0
  };
  if (!hasSkinAttributes) return stats;
  for (let vertex = 0; vertex < weights.length / 4; vertex += 1) {
    const offset = vertex * 4;
    if (hasImplicitFirstWeight) {
      const implicitWeight = 255 - weights[offset + 1] - weights[offset + 2] - weights[offset + 3];
      if (implicitWeight >= 0) {
        weights[offset] = implicitWeight;
        stats.implicitFirstWeight += 1;
        continue;
      }
      stats.invalidImplicitFirstWeight += 1;
    }

    const hasWeight = weights[offset] || weights[offset + 1] || weights[offset + 2] || weights[offset + 3];
    if (hasWeight) continue;

    const slot = indices[offset] || indices[offset + 1] || indices[offset + 2] || indices[offset + 3] ? firstNonZeroIndexSlot(indices, offset) : 0;
    weights[offset + slot] = 255;
    stats.zeroWeightFallback += 1;
  }
  return stats;
}

function firstNonZeroIndexSlot(indices, offset) {
  for (let slot = 0; slot < 4; slot += 1) {
    if (indices[offset + slot]) return slot;
  }
  return 0;
}

function readInverseBindMatrices(bin, accessors, bufferViews, maxJoints, accessorIndex) {
  if (!maxJoints) return [];
  if (Number.isInteger(accessorIndex) && accessors[accessorIndex]) {
    const accessor = accessors[accessorIndex];
    const bufferView = bufferViews[accessor.bufferView];
    if (bufferView) return readMatrixAccessor(bin, accessor, bufferView, maxJoints);
  }

  const candidates = accessors
    .map((accessor) => ({ accessor: accessor, bufferView: bufferViews[accessor.bufferView] }))
    .filter((candidate) => {
      const accessor = candidate.accessor;
      const bufferView = candidate.bufferView;
      if (!bufferView || accessor.count < 4 || accessor.count > maxJoints) return false;
      const needed = accessor.byteOffset + accessor.count * 64;
      return bufferView.byteLength >= needed && bufferView.byteLength <= needed + 16;
    })
    .sort((a, b) => b.accessor.count - a.accessor.count);
  if (!candidates.length) return [];

  return readMatrixAccessor(bin, candidates[0].accessor, candidates[0].bufferView, maxJoints);
}

function readMatrixAccessor(bin, accessor, bufferView, maxJoints) {
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const offset = bufferView.byteOffset + accessor.byteOffset;
  const matrices = [];
  const count = Math.min(accessor.count, maxJoints);
  for (let i = 0; i < count; i += 1) {
    const values = [];
    for (let element = 0; element < 16; element += 1) {
      values.push(view.getFloat32(offset + i * 64 + element * 4, true));
    }
    matrices.push(new THREE.Matrix4().fromArray(values));
  }
  return matrices;
}

function countWeightedVertices(weights) {
  let count = 0;
  for (let i = 0; i < weights.length; i += 4) {
    if (weights[i] || weights[i + 1] || weights[i + 2] || weights[i + 3]) count += 1;
  }
  return count;
}

function localMatrix(node) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(node.translation[0], node.translation[1], node.translation[2]),
    new THREE.Quaternion(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]),
    new THREE.Vector3(node.scale[0], node.scale[1], node.scale[2])
  );
}

function computeGlobalMatrices(nodes) {
  const globals = new Array(nodes.length);
  const resolving = new Set();

  const resolve = (index) => {
    if (globals[index]) return globals[index];
    if (resolving.has(index)) return localMatrix(nodes[index]);
    resolving.add(index);

    const node = nodes[index];
    const matrix = localMatrix(node);
    if (Number.isInteger(node.parent) && node.parent >= 0 && node.parent < nodes.length && node.parent !== index) {
      matrix.premultiply(resolve(node.parent));
    }

    resolving.delete(index);
    globals[index] = matrix;
    return matrix;
  };

  for (let i = 0; i < nodes.length; i += 1) resolve(i);
  return globals;
}

function globalMatricesByName(nodes, globals) {
  globals = globals || computeGlobalMatrices(nodes);
  const byName = new Map();
  for (const node of nodes) {
    if (node.name) byName.set(node.name, globals[node.index]);
  }
  return byName;
}

function nodesByName(nodes) {
  const byName = new Map();
  for (const node of nodes) {
    if (node.name && !byName.has(node.name)) byName.set(node.name, node);
  }
  return byName;
}

function decodeAnimation(animation, bin, accessors, bufferViews, nodes) {
  const packed = animation && animation.packed;
  if (!packed || !packed.nodes || !Number.isInteger(packed.dataAccessor)) return null;
  if (Number.isInteger(packed.uintAccessor)) {
    return decodeContinuousAnimation(animation, packed, bin, accessors, bufferViews, nodes);
  }
  const dataAccessor = accessors[packed.dataAccessor];
  const dataBufferView = dataAccessor ? bufferViews[dataAccessor.bufferView] : null;
  if (!dataAccessor || !dataBufferView) return null;

  const frameCount = Math.max(1, Math.round(animation.keyframeCount || animation.lastFrame || 1));
  const frameRate = animation.frameRate || 30;
  const view = new DataView(bin.buffer, bin.byteOffset + dataBufferView.byteOffset + dataAccessor.byteOffset, dataBufferView.byteLength - dataAccessor.byteOffset);
  const nodeMeta = readAnimationNodeMeta(bin, accessors, bufferViews, packed.nodeAccessor, packed.nodes.length);
  const nodesByChannelName = new Map();
  let wordOffset = 0;
  let decodedNodeCount = 0;
  let skippedSparseCount = 0;

  for (let packedIndex = 0; packedIndex < packed.nodes.length; packedIndex += 1) {
    const packedNode = packed.nodes[packedIndex];
    const node = nodes[packedNode.nodeIndex];
    const flags = packedNode.flags || 0;
    const rotationWords = flags & 2 ? 4 : 0;
    const translationWords = flags & 4 ? 3 : 0;
    const scaleWords = (flags & 8 ? 1 : 0) + (flags & 16 ? 2 : 0);
    const frameStride = rotationWords + translationWords + scaleWords;
    const availableSamples = frameStride ? Math.floor(Math.max(0, (packedNode.dataSize || 0) - 1) / frameStride) : 0;
    const headerWord = frameStride ? readI16Word(view, wordOffset) : 0;
    const fixedSampleCount = fixedPackedSampleCount(packedNode.dataSize || 0, headerWord, frameStride);
    const sampleCount = fixedSampleCount || availableSamples;

    if (node && node.name && frameStride && sampleCount > 0) {
      const samples = [];
      const meta = nodeMeta[packedIndex] || null;
      let cursor = wordOffset + 1;
      const end = wordOffset + (packedNode.dataSize || 0);
      const frameState = { frame: 0, runLength: fixedSampleCount ? 0 : Math.max(headerWord, 0) };
      while (cursor + frameStride <= end && (!fixedSampleCount || samples.length < fixedSampleCount)) {
        if (!fixedSampleCount) {
          const originalCursor = cursor;
          const previousSample = samples[samples.length - 1] || {
            rotation: node.rotation && node.rotation.length ? node.rotation : null,
            translation: node.translation && node.translation.length ? node.translation : null,
            restReference: true
          };
          const alignment = alignPackedSample(view, cursor, end, rotationWords, translationWords, scaleWords, previousSample, meta, {
            forceImmediate: frameState.runLength > 0
          });
          if (!alignment || alignment.missing) break;
          cursor = alignment.cursor;
          applyPackedControlWords(view, originalCursor, cursor - originalCursor, frameState);
        }
        if (cursor + frameStride > end) break;
        let rotation = null;
        let translation = null;
        let scale = null;
        const sampleFrame = fixedSampleCount ? null : frameState.frame;
        if (rotationWords) {
          rotation = normalizeQuaternion([
            readI16Word(view, cursor) / 32767,
            readI16Word(view, cursor + 1) / 32767,
            readI16Word(view, cursor + 2) / 32767,
            readI16Word(view, cursor + 3) / 32767
          ]);
          cursor += 4;
        }
        if (translationWords) {
          translation = decodeAnimationTranslation(meta, [
            readI16Word(view, cursor),
            readI16Word(view, cursor + 1),
            readI16Word(view, cursor + 2)
          ]);
          cursor += 3;
        }
        if (scaleWords) {
          const rawScale = [];
          for (let i = 0; i < scaleWords; i += 1) rawScale.push(readI16Word(view, cursor + i));
          scale = decodeAnimationScale(meta, rawScale);
          cursor += scaleWords;
        }
        samples.push({ rotation, translation, scale, frame: sampleFrame });
        if (!fixedSampleCount) {
          frameState.frame += 1;
          if (frameState.runLength > 0) frameState.runLength -= 1;
        }
      }
      nodesByChannelName.set(node.name, { samples, sourceNodeIndex: packedNode.nodeIndex });
      decodedNodeCount += 1;
    } else if (frameStride && packedNode.dataSize) {
      skippedSparseCount += 1;
    }
    wordOffset += packedNode.dataSize || 0;
  }

  return {
    frameRate,
    frameCount,
    duration: frameCount / frameRate,
    nodesByName: nodesByChannelName,
    packedNodeCount: packed.nodes.length,
    decodedNodeCount,
    skippedSparseCount
  };
}

function decodeContinuousAnimation(animation, packed, bin, accessors, bufferViews, nodes) {
  if (!Number.isInteger(packed.nodeAccessor)) throw new Error("continuous packed animation is missing its base transform accessor");
  const frameCount = Math.max(1, Math.round(animation.keyframeCount || animation.lastFrame || 1));
  const frameRate = animation.frameRate || 30;
  const dataWords = readAnimationAccessor(bin, accessors, bufferViews, packed.dataAccessor, "i16");
  const nodeBaseData = readAnimationAccessor(bin, accessors, bufferViews, packed.nodeAccessor, "f32");
  const baseRotationWords = readAnimationAccessor(bin, accessors, bufferViews, packed.uintAccessor, "i16");
  const bases = readContinuousPackedBases(packed.nodes.length, nodeBaseData, baseRotationWords);
  const decoded = decodeContinuousPackedAnimationData(packed.nodes, dataWords, bases, frameCount);
  const nodesByChannelName = new Map();
  let skippedSparseCount = 0;

  for (let channelIndex = 0; channelIndex < decoded.channels.length; channelIndex += 1) {
    const channel = decoded.channels[channelIndex];
    const node = nodes[channel.nodeIndex];
    if (!node || !node.name) {
      skippedSparseCount += 1;
      continue;
    }
    nodesByChannelName.set(node.name, {
      samples: channel.samples,
      base: bases[channelIndex],
      sourceNodeIndex: channel.nodeIndex
    });
  }

  return {
    frameRate,
    frameCount,
    duration: frameCount / frameRate,
    nodesByName: nodesByChannelName,
    packedNodeCount: packed.nodes.length,
    decodedNodeCount: nodesByChannelName.size,
    skippedSparseCount,
    packedFormat: "continuous",
    packedStats: decoded.stats
  };
}

function readAnimationAccessor(bin, accessors, bufferViews, accessorIndex, kind) {
  const accessor = accessors[accessorIndex];
  const bufferView = accessor ? bufferViews[accessor.bufferView] : null;
  if (!accessor || !bufferView) throw new Error(`missing packed animation accessor ${accessorIndex}`);
  const itemSize = kind === "f32" ? 4 : 2;
  const count = accessor.count || 0;
  const byteOffset = bufferView.byteOffset + accessor.byteOffset;
  const byteLength = count * itemSize;
  if (byteOffset < 0 || byteOffset + byteLength > bin.byteLength || byteLength > bufferView.byteLength - accessor.byteOffset) {
    throw new Error(`packed animation accessor ${accessorIndex} is truncated`);
  }
  const view = new DataView(bin.buffer, bin.byteOffset + byteOffset, byteLength);
  const values = kind === "f32" ? new Float32Array(count) : new Int16Array(count);
  for (let index = 0; index < count; index += 1) {
    values[index] = kind === "f32" ? view.getFloat32(index * 4, true) : view.getInt16(index * 2, true);
  }
  return values;
}

function applyPackedControlWords(view, cursor, wordCount, frameState) {
  const end = cursor + wordCount;
  while (cursor + 1 < end) {
    const first = readI16Word(view, cursor);
    const second = readI16Word(view, cursor + 1);
    if (first < 0 && second > 0 && Math.abs(first) <= 2048 && second <= 2048) {
      frameState.frame += -first;
      frameState.runLength = second;
      cursor += 2;
      continue;
    }
    cursor += 1;
  }
}

function fixedPackedSampleCount(dataSize, headerWord, frameStride) {
  if (!frameStride || headerWord <= 0) return 0;
  const expectedWords = 1 + headerWord * frameStride;
  const trailingWords = dataSize - expectedWords;
  return trailingWords >= 0 && trailingWords < frameStride ? headerWord : 0;
}

function readAnimationNodeMeta(bin, accessors, bufferViews, accessorIndex, channelCount) {
  if (!Number.isInteger(accessorIndex) || !accessors[accessorIndex]) return [];
  const accessor = accessors[accessorIndex];
  const bufferView = bufferViews[accessor.bufferView];
  if (!bufferView) return [];
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const base = bufferView.byteOffset + accessor.byteOffset;
  const count = Math.min(channelCount, Math.floor(accessor.count / 8));
  const metas = [];
  for (let i = 0; i < count; i += 1) {
    const offset = base + i * 8 * 4;
    metas.push({
      translation: [
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true)
      ],
      scale: [
        view.getFloat32(offset + 12, true),
        view.getFloat32(offset + 16, true),
        view.getFloat32(offset + 20, true)
      ],
      translationStep: view.getFloat32(offset + 24, true),
      scaleStep: view.getFloat32(offset + 28, true)
    });
  }
  return metas;
}

function decodeAnimationTranslation(meta, raw) {
  if (!meta) return null;
  const step = Number.isFinite(meta.translationStep) ? meta.translationStep : 1 / 32767;
  return [
    meta.translation[0] + raw[0] * step,
    meta.translation[1] + raw[1] * step,
    meta.translation[2] + raw[2] * step
  ];
}

function decodeAnimationScale(meta, raw) {
  if (!meta || !raw.length) return null;
  const step = Number.isFinite(meta.scaleStep) ? meta.scaleStep : 1 / 32767;
  if (raw.length === 1) {
    const value = meta.scale[0] + raw[0] * step;
    return [value, value, value];
  }
  return [
    meta.scale[0] + raw[0] * step,
    meta.scale[1] + (raw[1] || 0) * step,
    meta.scale[2] + (raw[2] || 0) * step
  ];
}

function alignPackedSample(view, cursor, end, rotationWords, translationWords, auxWords, previousSample, meta, options = {}) {
  const stride = rotationWords + translationWords + auxWords;
  const immediate = packedSampleCandidate(view, cursor, rotationWords, translationWords, meta);
  if (options.forceImmediate && immediate) {
    return { cursor, score: scorePackedSample(immediate, 0, previousSample), skip: 0 };
  }
  const controlSkip = packedControlWordSkip(view, cursor, end, stride);
  if (immediate && controlSkip) {
    const skipped = packedSampleCandidate(view, cursor + controlSkip, rotationWords, translationWords, meta);
    if (skipped) {
      const immediateScore = scorePackedSample(immediate, 0, previousSample);
      const skippedScore = scorePackedSample(skipped, controlSkip, previousSample);
      if (skippedScore + 0.5 < immediateScore) return { cursor: cursor + controlSkip, score: skippedScore, skip: controlSkip };
      return { cursor, score: immediateScore, skip: 0 };
    }
  }
  if (immediate) return { cursor, score: scorePackedSample(immediate, 0, previousSample), skip: 0 };

  const maxSkip = Math.min(96, Math.max(0, end - cursor - stride));
  for (let skip = controlSkip || 1; skip <= maxSkip; skip += 1) {
    if (controlSkip && skip < controlSkip) continue;
    const candidate = cursor + skip;
    if (candidate + stride > end) break;
    const sample = packedSampleCandidate(view, candidate, rotationWords, translationWords, meta);
    if (!sample) continue;
    return { cursor: candidate, score: scorePackedSample(sample, skip, previousSample), skip };
  }
  return { cursor, score: Infinity, skip: 0, missing: true };
}

function packedControlWordSkip(view, cursor, end, stride) {
  if (cursor + 2 + stride > end) return 0;
  const first = readI16Word(view, cursor);
  const second = readI16Word(view, cursor + 1);
  return first < 0 && second > 0 && Math.abs(first) <= 2048 && second <= 2048 ? 2 : 0;
}

function isPlausiblePackedSample(view, cursor, rotationWords, translationWords) {
  return Boolean(packedSampleCandidate(view, cursor, rotationWords, translationWords, null));
}

function packedSampleCandidate(view, cursor, rotationWords, translationWords, meta) {
  let rotation = null;
  let rotationLength = 0;
  let nearZeroRotationWords = 0;
  if (rotationWords) {
    const raw = [
      readI16Word(view, cursor),
      readI16Word(view, cursor + 1),
      readI16Word(view, cursor + 2),
      readI16Word(view, cursor + 3)
    ];
    rotationLength = Math.hypot(raw[0], raw[1], raw[2], raw[3]);
    if (rotationLength < 31500 || rotationLength > 34000) return null;
    nearZeroRotationWords = raw.filter((value) => Math.abs(value) < 32).length;
    rotation = normalizeQuaternion(raw.map((value) => value / 32767));
  }
  let translation = null;
  if (translationWords) {
    const base = cursor + rotationWords;
    const raw = [
      readI16Word(view, base),
      readI16Word(view, base + 1),
      readI16Word(view, base + 2)
    ];
    translation = decodeAnimationTranslation(meta, raw);
  }
  return {
    rotation,
    translation,
    rotationLength,
    nearZeroRotationWords,
    normError: rotationWords ? Math.abs(rotationLength - 32767) / 32767 : 0
  };
}

function scorePackedSample(sample, skip, previousSample) {
  let score = skip * 0.2 + sample.normError * 4;
  if (sample.nearZeroRotationWords >= 2) score += 0.15;
  if (previousSample && previousSample.rotation && sample.rotation) {
    const angle = quaternionAngle(previousSample.rotation, sample.rotation);
    if (previousSample.restReference) {
      score += angle / 120;
      if (angle > 150) score += 1.5;
    } else {
      score += angle / 24;
      if (angle > 100) score += 4;
      if (angle > 150) score += 8;
      if (angle > 100 && sample.nearZeroRotationWords >= 2) score += 3;
    }
  }
  if (previousSample && previousSample.translation && sample.translation) {
    const dist = Math.hypot(
      previousSample.translation[0] - sample.translation[0],
      previousSample.translation[1] - sample.translation[1],
      previousSample.translation[2] - sample.translation[2]
    );
    score += Math.min(dist, 50) / (previousSample.restReference ? 20 : 5);
    if (!previousSample.restReference && dist > 12) score += 2;
  }
  return score;
}

function quaternionAngle(a, b) {
  const dot = Math.abs(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
  return 2 * Math.acos(dot) * 180 / Math.PI;
}

function readI16Word(view, wordOffset) {
  return view.getInt16(wordOffset * 2, true);
}

function normalizeQuaternion(values) {
  const length = Math.hypot(values[0], values[1], values[2], values[3]) || 1;
  return [values[0] / length, values[1] / length, values[2] / length, values[3] / length];
}

function vertexStreamForMesh(decoded, meshInfo) {
  if (!decoded.streams || !decoded.streams.length) return decoded;
  const index = meshInfo && Number.isInteger(meshInfo.streamIndex) ? meshInfo.streamIndex : 0;
  return decoded.streams[index] || decoded.streams[0];
}

function posePositions(decoded, pose, frameIndex, meshInfo) {
  const stream = vertexStreamForMesh(decoded, meshInfo);
  if (!pose || !stream.boneIndices || !stream.boneIndices.length || !stream.boneWeights || !stream.boneWeights.length) return stream.positions;
  const skin = skinForMesh(decoded, meshInfo);
  if (!skin || !skin.jointNodes || !skin.jointNodes.length) return stream.positions;

  const posed = new Float32Array(stream.positions.length);
  const poseGlobals = retargetedPoseGlobals(decoded, pose, frameIndex);
  const source = new THREE.Vector3();
  const target = new THREE.Vector3();
  const accum = new THREE.Vector3();
  const skinMatrix = new THREE.Matrix4();
  const fallbackInverse = new THREE.Matrix4();
  const meshMatrix = meshNodePoseDelta(decoded, poseGlobals, meshInfo && meshInfo.nodeIndex);

  for (let vertex = 0; vertex < stream.vertexCount; vertex += 1) {
    const posOffset = vertex * 3;
    source.fromArray(stream.positions, posOffset);
    accum.set(0, 0, 0);

    const influenceOffset = vertex * 4;
    const weightSum =
      stream.boneWeights[influenceOffset] +
      stream.boneWeights[influenceOffset + 1] +
      stream.boneWeights[influenceOffset + 2] +
      stream.boneWeights[influenceOffset + 3];

    if (weightSum === 0) {
      target.copy(source);
      if (meshMatrix) target.applyMatrix4(meshMatrix);
      posed[posOffset] = target.x;
      posed[posOffset + 1] = target.y;
      posed[posOffset + 2] = target.z;
      continue;
    }

    let appliedWeight = 0;
    for (let slot = 0; slot < 4; slot += 1) {
      const rawWeight = stream.boneWeights[influenceOffset + slot];
      if (!rawWeight) continue;

      const jointIndex = stream.boneIndices[influenceOffset + slot];
      const joint = skin.jointNodes[jointIndex];
      if (!joint) continue;

      const poseGlobal = poseGlobals[joint.index] || decoded.globals[joint.index];
      const inverseBind =
        skin.inverseBindMatrices[jointIndex] ||
        fallbackInverse.copy(decoded.globals[joint.index]).invert();

      skinMatrix.multiplyMatrices(poseGlobal, inverseBind);
      target.copy(source).applyMatrix4(skinMatrix).multiplyScalar(rawWeight / weightSum);
      accum.add(target);
      appliedWeight += rawWeight;
    }

    if (appliedWeight === 0) {
      accum.copy(source);
    } else if (appliedWeight < weightSum) {
      accum.addScaledVector(source, (weightSum - appliedWeight) / weightSum);
    }

    posed[posOffset] = accum.x;
    posed[posOffset + 1] = accum.y;
    posed[posOffset + 2] = accum.z;
  }

  return posed;
}

function poseNormals(decoded, pose, frameIndex, meshInfo) {
  const stream = vertexStreamForMesh(decoded, meshInfo);
  if (!stream.normals || !stream.normals.length) return null;
  if (!pose || !stream.boneIndices || !stream.boneIndices.length || !stream.boneWeights || !stream.boneWeights.length) return stream.normals;
  const skin = skinForMesh(decoded, meshInfo);
  if (!skin || !skin.jointNodes || !skin.jointNodes.length) return stream.normals;

  const posed = new Float32Array(stream.normals.length);
  const poseGlobals = retargetedPoseGlobals(decoded, pose, frameIndex);
  const source = new THREE.Vector3();
  const target = new THREE.Vector3();
  const accum = new THREE.Vector3();
  const skinMatrix = new THREE.Matrix4();
  const normalMatrix = new THREE.Matrix3();
  const fallbackInverse = new THREE.Matrix4();
  const meshMatrix = meshNodePoseDelta(decoded, poseGlobals, meshInfo && meshInfo.nodeIndex);
  const meshNormalMatrix = meshMatrix ? new THREE.Matrix3().getNormalMatrix(meshMatrix) : null;

  for (let vertex = 0; vertex < stream.vertexCount; vertex += 1) {
    const normalOffset = vertex * 3;
    source.fromArray(stream.normals, normalOffset);
    accum.set(0, 0, 0);

    const influenceOffset = vertex * 4;
    const weightSum =
      stream.boneWeights[influenceOffset] +
      stream.boneWeights[influenceOffset + 1] +
      stream.boneWeights[influenceOffset + 2] +
      stream.boneWeights[influenceOffset + 3];

    if (weightSum === 0) {
      target.copy(source);
      if (meshNormalMatrix) target.applyMatrix3(meshNormalMatrix);
      target.normalize();
      posed[normalOffset] = target.x;
      posed[normalOffset + 1] = target.y;
      posed[normalOffset + 2] = target.z;
      continue;
    }

    let appliedWeight = 0;
    for (let slot = 0; slot < 4; slot += 1) {
      const rawWeight = stream.boneWeights[influenceOffset + slot];
      if (!rawWeight) continue;

      const jointIndex = stream.boneIndices[influenceOffset + slot];
      const joint = skin.jointNodes[jointIndex];
      if (!joint) continue;

      const poseGlobal = poseGlobals[joint.index] || decoded.globals[joint.index];
      const inverseBind =
        skin.inverseBindMatrices[jointIndex] ||
        fallbackInverse.copy(decoded.globals[joint.index]).invert();

      skinMatrix.multiplyMatrices(poseGlobal, inverseBind);
      normalMatrix.getNormalMatrix(skinMatrix);
      target.copy(source).applyMatrix3(normalMatrix).multiplyScalar(rawWeight / weightSum);
      accum.add(target);
      appliedWeight += rawWeight;
    }

    if (appliedWeight === 0) {
      accum.copy(source);
    } else if (appliedWeight < weightSum) {
      accum.addScaledVector(source, (weightSum - appliedWeight) / weightSum);
    }

    accum.normalize();
    posed[normalOffset] = accum.x;
    posed[normalOffset + 1] = accum.y;
    posed[normalOffset + 2] = accum.z;
  }

  return posed;
}

function shouldUseSmoothShading(meshInfo, pose) {
  if (!state.smoothShading) return false;
  return Boolean(meshInfo || pose);
}

function skinForMesh(decoded, meshInfo) {
  const skinIndex = meshInfo && Number.isInteger(meshInfo.skinIndex) ? meshInfo.skinIndex : null;
  if (Number.isInteger(skinIndex) && decoded.skins && decoded.skins[skinIndex]) return decoded.skins[skinIndex];
  return decoded.defaultSkin || { jointNodes: decoded.jointNodes || [], inverseBindMatrices: decoded.inverseBindMatrices || [] };
}

function meshNodePoseDelta(decoded, poseGlobals, meshNodeIndex) {
  if (!Number.isInteger(meshNodeIndex) || !poseGlobals[meshNodeIndex] || !decoded.globals[meshNodeIndex]) return null;
  return new THREE.Matrix4().multiplyMatrices(
    poseGlobals[meshNodeIndex],
    new THREE.Matrix4().copy(decoded.globals[meshNodeIndex]).invert()
  );
}

function retargetedPoseGlobals(decoded, pose, frameIndex) {
  const frameKey = Number.isInteger(frameIndex) ? frameIndex : -1;
  const cacheKey = `${decoded.sourcePath || ""}:pose-hierarchy:${frameKey}`;
  if (!pose.retargetedFrameCache) pose.retargetedFrameCache = new Map();
  if (pose.retargetedFrameCache.has(cacheKey)) return pose.retargetedFrameCache.get(cacheKey);

  const useAnimationLocals = pose.animation && pose.animation.packedFormat === "continuous";
  const poseGlobalsByName = useAnimationLocals ? null : poseHierarchyGlobalsByName(pose, frameKey);
  let animationGlobals = null;
  const globals = new Array(decoded.nodes.length);
  const resolving = new Set();

  const resolve = (index) => {
    if (globals[index]) return globals[index];
    if (resolving.has(index)) return decoded.globals[index] ? decoded.globals[index].clone() : localMatrix(decoded.nodes[index]);
    resolving.add(index);

    const node = decoded.nodes[index];
    const poseGlobal = !useAnimationLocals && node.name ? poseGlobalsByName.get(node.name) : null;
    const hierarchyGlobal = useAnimationLocals
      ? mismatchedAnimationGlobal(node, decoded, pose, frameKey, () => {
        if (!animationGlobals) animationGlobals = poseHierarchyGlobals(pose, frameKey);
        return animationGlobals;
      })
      : null;
    const matrix = hierarchyGlobal
      ? hierarchyGlobal.clone()
      : useAnimationLocals
        ? animationLocalMatrix(node, pose, frameKey)
        : poseGlobal ? poseGlobal.clone() : localMatrix(node);
    if (!hierarchyGlobal && (useAnimationLocals || !poseGlobal) && Number.isInteger(node.parent) && node.parent >= 0 && node.parent < decoded.nodes.length && node.parent !== index) {
      matrix.premultiply(resolve(node.parent));
    }

    globals[index] = matrix;
    resolving.delete(index);
    return matrix;
  };

  for (let i = 0; i < decoded.nodes.length; i += 1) resolve(i);
  pose.retargetedFrameCache.set(cacheKey, globals);
  return globals;
}

function mismatchedAnimationGlobal(modelNode, decoded, pose, frameIndex, animationGlobals) {
  const channel = animationChannelForModelNode(modelNode, pose);
  // A constant joint still inherits animated control parents. Omitting joints
  // without their own packed channel leaves hands in the geometry rig while
  // weapons follow the animation rig, separating the grip during idle poses.
  const sourceNode = Number.isInteger(channel?.sourceNodeIndex)
    ? pose.nodes[channel.sourceNodeIndex]
    : pose.nodesByName?.get(resolveAnimationSourceName(modelNode.name));
  if (!sourceNode) return null;
  const modelParent = Number.isInteger(modelNode.parent) ? decoded.nodes[modelNode.parent] : null;
  const sourceParent = Number.isInteger(sourceNode.parent) ? pose.nodes[sourceNode.parent] : null;
  if (!requiresAnimationGlobalRemap(modelParent && modelParent.name, sourceParent && sourceParent.name)) return null;
  const animatedGlobal = animationGlobals()[sourceNode.index];
  const modelRestGlobal = decoded.globals[modelNode.index];
  if (!animatedGlobal || !modelRestGlobal) return null;

  // The animation hierarchy is authoritative for the attachment's world-space
  // position and rotation. Its root may use a different unit scale (Dark Days'
  // gun animates between 0.01 and 1), so the geometry bind scale stays authoritative.
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const modelRestScale = new THREE.Vector3();
  animatedGlobal.decompose(position, rotation, new THREE.Vector3());
  modelRestGlobal.decompose(new THREE.Vector3(), new THREE.Quaternion(), modelRestScale);
  return new THREE.Matrix4().compose(position, rotation, modelRestScale);
}

function animationChannelForModelNode(modelNode, pose) {
  if (!modelNode.name || !pose.animation) return null;
  return pose.animation.nodesByName.get(resolveAnimationSourceName(modelNode.name));
}

function animationLocalMatrix(modelNode, pose, frameIndex) {
  const channel = animationChannelForModelNode(modelNode, pose);
  // Packed clips omit constant tracks. Their authored pose is in the animation
  // node, not the geometry bind pose; using the latter breaks hands and props.
  if (!channel) return localMatrix(pose.nodesByName?.get(modelNode.name) || modelNode);
  const sample = sampleAnimationChannel(channel, pose.animation, frameIndex);
  const modelRest = {
    translation: modelNode.translation || [0, 0, 0],
    rotation: modelNode.rotation || [0, 0, 0, 1],
    scale: modelNode.scale || [1, 1, 1]
  };
  const sourceNode = Number.isInteger(channel.sourceNodeIndex) ? pose.nodes[channel.sourceNodeIndex] : null;
  const transform = sourceNode && sourceNode.name !== modelNode.name
    ? resolveAliasedRotationTransform(modelRest, {
      translation: sourceNode.translation || [0, 0, 0],
      rotation: sourceNode.rotation || [0, 0, 0, 1],
      scale: sourceNode.scale || [1, 1, 1]
    }, sample)
    : resolveAnimationLocalTransform(modelRest, sample);
  return new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(transform.translation),
    new THREE.Quaternion().fromArray(transform.rotation),
    new THREE.Vector3().fromArray(transform.scale)
  );
}

function poseHierarchyGlobalsByName(pose, frameIndex) {
  const globals = poseHierarchyGlobals(pose, frameIndex);
  const byName = new Map();
  for (const node of pose.nodes) {
    if (node.name && !byName.has(node.name)) byName.set(node.name, globals[node.index]);
  }
  return byName;
}

function poseDeltaGlobalsByName(decoded, pose, frameIndex) {
  if (!pose || !pose.nodes || !pose.nodes.length) return null;
  const poseRestGlobals = pose.restGlobals || (pose.restGlobals = computeGlobalMatrices(pose.nodes));
  const poseAnimatedGlobals = poseHierarchyGlobals(pose, frameIndex);
  const byName = new Map();
  const inverseRest = new THREE.Matrix4();

  for (const node of decoded.nodes) {
    const poseNode = node.name && pose.nodesByName ? pose.nodesByName.get(node.name) : null;
    if (!poseNode || !decoded.globals[node.index] || !poseRestGlobals[poseNode.index] || !poseAnimatedGlobals[poseNode.index]) continue;
    inverseRest.copy(poseRestGlobals[poseNode.index]).invert();
    byName.set(
      node.name,
      new THREE.Matrix4()
        .multiplyMatrices(poseAnimatedGlobals[poseNode.index], inverseRest)
        .multiply(decoded.globals[node.index])
    );
  }

  return byName;
}

function poseHierarchyGlobals(pose, frameIndex) {
  const globals = new Array(pose.nodes.length);
  const resolving = new Set();

  const resolve = (index) => {
    if (globals[index]) return globals[index];
    if (resolving.has(index)) return localMatrix(pose.nodes[index]);
    resolving.add(index);

    const node = pose.nodes[index];
    const matrix = poseLocalMatrix(node, pose, frameIndex);
    if (Number.isInteger(node.parent) && node.parent >= 0 && node.parent < pose.nodes.length && node.parent !== index) {
      matrix.premultiply(resolve(node.parent));
    }

    globals[index] = matrix;
    resolving.delete(index);
    return matrix;
  };

  for (let i = 0; i < pose.nodes.length; i += 1) resolve(i);
  return globals;
}

function poseLocalMatrix(source, pose, frameIndex) {
  let rotation = source.rotation;
  let translation = source.translation;
  let scale = source.scale;
  const channel = source.name && pose.animation && pose.animation.nodesByName.get(source.name);
  const channelTargetsSource = channel && (
    !Number.isInteger(channel.sourceNodeIndex) || channel.sourceNodeIndex === source.index
  );
  if (channelTargetsSource && frameIndex >= 0) {
    const sample = sampleAnimationChannel(channel, pose.animation, frameIndex);
    if (sample && sample.rotation) rotation = sample.rotation;
    if (sample && sample.translation) translation = sample.translation;
    if (sample && sample.scale) scale = sample.scale;
  }
  return new THREE.Matrix4().compose(
    new THREE.Vector3(translation[0], translation[1], translation[2]),
    new THREE.Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]),
    new THREE.Vector3(scale[0], scale[1], scale[2])
  );
}

function sampleAnimationChannel(channel, animation, frameIndex) {
  const samples = channel.samples || [];
  if (!samples.length) return null;
  if (samples.length === 1 || animation.frameCount <= 1) return samples[0];

  const wrappedFrame = ((frameIndex % animation.frameCount) + animation.frameCount) % animation.frameCount;
  if (Number.isFinite(samples[0].frame)) {
    const first = samples[0];
    const last = samples[samples.length - 1];
    const firstFrame = Number.isFinite(first.frame) ? first.frame : 0;
    const lastFrame = Number.isFinite(last.frame) ? last.frame : firstFrame;
    if (wrappedFrame <= firstFrame) return first;

    let low = 0;
    let high = samples.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((samples[mid].frame || 0) <= wrappedFrame) low = mid + 1;
      else high = mid;
    }
    const leftIndex = Math.max(0, low - 1);
    const rightIndex = low < samples.length ? low : 0;
    const left = samples[leftIndex];
    const right = samples[rightIndex];
    if (!right || left === right) return left;

    const leftFrame = Number.isFinite(left.frame) ? left.frame : 0;
    let rightFrame = Number.isFinite(right.frame) ? right.frame : animation.frameCount;
    let frame = wrappedFrame;
    if (rightIndex === 0) rightFrame += animation.frameCount;
    if (frame < leftFrame) frame += animation.frameCount;
    if (shouldHoldSparseAnimationSample(channel, animation, left, right, leftIndex, rightIndex)) {
      return left;
    }

    const span = Math.max(rightFrame - leftFrame, 1);
    const t = THREE.MathUtils.clamp((frame - leftFrame) / span, 0, 1);
    return interpolateAnimationSamples(left, right, t);
  }

  const samplePosition = wrappedFrame * (samples.length - 1) / Math.max(animation.frameCount - 1, 1);
  const leftIndex = Math.floor(samplePosition);
  const rightIndex = Math.min(samples.length - 1, leftIndex + 1);
  const t = samplePosition - leftIndex;
  const left = samples[leftIndex];
  const right = samples[rightIndex];
  if (!right || t === 0) return left;

  return interpolateAnimationSamples(left, right, t);
}

function shouldHoldSparseAnimationSample(channel, animation, left, right, leftIndex, rightIndex) {
  const samples = channel.samples || [];
  if (samples.length < 2 || samples.length > 4 || animation.frameCount < 2) return false;
  if (!Number.isFinite(left.frame) || !Number.isFinite(right.frame)) return false;
  const last = samples[samples.length - 1];
  const first = samples[0];
  if (!samplesNearlyEqual(first, last)) return false;
  const frameSpan = rightIndex === 0
    ? right.frame + animation.frameCount - left.frame
    : right.frame - left.frame;
  return frameSpan > Math.max(8, animation.frameCount * 0.2) || leftIndex === 0 || rightIndex === 0;
}

function samplesNearlyEqual(a, b) {
  if (!a || !b) return false;
  return vectorNearlyEqual(a.rotation, b.rotation, 1e-4) &&
    vectorNearlyEqual(a.translation, b.translation, 1e-4) &&
    vectorNearlyEqual(a.scale, b.scale, 1e-4);
}

function vectorNearlyEqual(a, b, tolerance) {
  if (!a && !b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (Math.abs(a[i] - b[i]) > tolerance) return false;
  }
  return true;
}

function interpolateAnimationSamples(left, right, t) {
  if (!right || t === 0) return left;
  const out = {};
  if (left.rotation && right.rotation) {
    const q = new THREE.Quaternion(left.rotation[0], left.rotation[1], left.rotation[2], left.rotation[3]);
    q.slerp(new THREE.Quaternion(right.rotation[0], right.rotation[1], right.rotation[2], right.rotation[3]), t);
    out.rotation = [q.x, q.y, q.z, q.w];
  } else {
    out.rotation = left.rotation || right.rotation;
  }
  if (left.translation && right.translation) {
    out.translation = [
      THREE.MathUtils.lerp(left.translation[0], right.translation[0], t),
      THREE.MathUtils.lerp(left.translation[1], right.translation[1], t),
      THREE.MathUtils.lerp(left.translation[2], right.translation[2], t)
    ];
  } else {
    out.translation = left.translation || right.translation;
  }
  if (left.scale && right.scale) {
    out.scale = [
      THREE.MathUtils.lerp(left.scale[0], right.scale[0], t),
      THREE.MathUtils.lerp(left.scale[1], right.scale[1], t),
      THREE.MathUtils.lerp(left.scale[2], right.scale[2], t)
    ];
  } else {
    out.scale = left.scale || right.scale;
  }
  return out;
}

function materialForMesh(decoded, meshInfo, useTexture) {
  const materialInfo = decoded.materials && decoded.materials[meshInfo.material] ? decoded.materials[meshInfo.material] : null;
  if (isGlassMaterial(materialInfo)) {
    return new THREE.MeshPhysicalMaterial({
      color: 0x8bdcff,
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.28,
      thickness: 0.24,
      opacity: 0.36,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      emissive: 0x0b3148,
      emissiveIntensity: 0.2,
      wireframe: state.wireframe
    });
  }

  return new THREE.MeshStandardMaterial({
    color: useTexture ? 0xffffff : meshColor(meshInfo),
    map: useTexture ? decoded.texture : null,
    roughness: 0.72,
    metalness: 0.04,
    // SC3D diffuse alpha is often packed material data, not cutout opacity.
    alphaTest: 0,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide,
    wireframe: state.wireframe
  });
}

function isGlassMaterial(materialInfo) {
  const name = materialInfo && materialInfo.name ? materialInfo.name.toLowerCase() : "";
  const shader = materialInfo && materialInfo.shader ? materialInfo.shader.toLowerCase() : "";
  return name.includes("glass") || shader.includes("glass");
}

function exportNodeName(node, usedNames) {
  const source = String(node.name || `node_${node.index}`).replace(/[^a-zA-Z0-9_-]+/g, "_") || `node_${node.index}`;
  let name = source;
  let suffix = 2;
  while (usedNames.has(name)) name = `${source}_${suffix++}`;
  usedNames.add(name);
  return name;
}

function setObjectTransform(object, node) {
  object.position.fromArray(node.translation || [0, 0, 0]);
  object.quaternion.fromArray(node.rotation || [0, 0, 0, 1]).normalize();
  object.scale.fromArray(node.scale || [1, 1, 1]);
}

function buildExportNodeHierarchy(decoded, root) {
  const usedNames = new Set();
  const objects = decoded.nodes.map((node) => {
    const bone = new THREE.Bone();
    bone.name = exportNodeName(node, usedNames);
    bone.userData.sc3dSourceName = node.name || "";
    bone.userData.sc3dNodeIndex = node.index;
    setObjectTransform(bone, node);
    return bone;
  });

  for (const node of decoded.nodes) {
    const object = objects[node.index];
    const parent = Number.isInteger(node.parent) ? objects[node.parent] : null;
    if (parent && parent !== object) parent.add(object);
    else root.add(object);
  }
  root.updateMatrixWorld(true);
  return objects;
}

function normalizedSkinAttributes(stream, jointCount, staticJointIndex, jointIndexOffset = 0) {
  const indices = new Uint16Array(stream.vertexCount * 4);
  const weights = new Float32Array(stream.vertexCount * 4);
  for (let vertex = 0; vertex < stream.vertexCount; vertex += 1) {
    const offset = vertex * 4;
    let total = 0;
    for (let slot = 0; slot < 4; slot += 1) {
      const joint = stream.boneIndices[offset + slot];
      const weight = stream.boneWeights[offset + slot];
      if (!weight || joint >= jointCount) continue;
      indices[offset + slot] = joint + jointIndexOffset;
      weights[offset + slot] = weight;
      total += weight;
    }
    if (total === 0) {
      indices[offset] = staticJointIndex;
      weights[offset] = 1;
      continue;
    }
    for (let slot = 0; slot < 4; slot += 1) weights[offset + slot] /= total;
  }
  return { indices, weights };
}

function compactVertexStream(stream, sourceIndices) {
  const oldToNew = new Map();
  const referenced = [];
  for (let i = 0; i < sourceIndices.length; i += 1) {
    const sourceIndex = sourceIndices[i];
    if (oldToNew.has(sourceIndex)) continue;
    oldToNew.set(sourceIndex, referenced.length);
    referenced.push(sourceIndex);
  }
  const IndexArray = referenced.length > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(sourceIndices.length);
  for (let i = 0; i < sourceIndices.length; i += 1) indices[i] = oldToNew.get(sourceIndices[i]);

  const copy = (source, itemSize, ArrayType = source && source.constructor) => {
    if (!source || !source.length) return null;
    const output = new ArrayType(referenced.length * itemSize);
    for (let destination = 0; destination < referenced.length; destination += 1) {
      const sourceOffset = referenced[destination] * itemSize;
      output.set(source.subarray(sourceOffset, sourceOffset + itemSize), destination * itemSize);
    }
    return output;
  };

  return {
    vertexCount: referenced.length,
    indices,
    positions: copy(stream.positions, 3, Float32Array),
    uvs: copy(stream.uvs, 2, Float32Array),
    normals: copy(stream.normals, 3, Float32Array),
    boneIndices: copy(stream.boneIndices, 4, Uint8Array),
    boneWeights: copy(stream.boneWeights, 4)
  };
}

function exportGeometry(decoded, meshInfo, skin, jointIndexOffset = 0) {
  const stream = compactVertexStream(vertexStreamForMesh(decoded, meshInfo), meshInfo.indices);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(stream.positions, 3));
  if (stream.uvs && stream.uvs.length === stream.vertexCount * 2) {
    geometry.setAttribute("uv", new THREE.BufferAttribute(stream.uvs, 2));
  }
  if (stream.normals && stream.normals.length === stream.vertexCount * 3 && !state.smoothShading) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(stream.normals, 3));
  }
  geometry.setIndex(new THREE.BufferAttribute(stream.indices, 1));
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

  if (skin && skin.jointNodes.length) {
    const staticJointIndex = jointIndexOffset + skin.jointNodes.length;
    const attributes = normalizedSkinAttributes(stream, skin.jointNodes.length, staticJointIndex, jointIndexOffset);
    geometry.setAttribute("skinIndex", new THREE.BufferAttribute(attributes.indices, 4));
    geometry.setAttribute("skinWeight", new THREE.BufferAttribute(attributes.weights, 4));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function exportMaterial(decoded, meshInfo) {
  const useTexture = Boolean(decoded.texture);
  const material = materialForMesh(decoded, meshInfo, useTexture);
  material.name = `material_${meshInfo.material}`;
  material.wireframe = false;
  return material;
}

function buildExportScene(decoded, pose) {
  if (!decoded || !pose || !pose.animation) throw new Error("choose an animated pose before exporting");
  if (!decoded.texture) throw new Error("the selected model has no decoded texture to embed");

  const root = new THREE.Scene();
  root.name = "Skin";
  const skeletonRoot = new THREE.Bone();
  skeletonRoot.name = "skeleton_root";
  root.add(skeletonRoot);
  const nodeObjects = buildExportNodeHierarchy(decoded, skeletonRoot);
  const disposable = [];
  let skinnedMeshCount = 0;

  for (const meshInfo of decoded.renderMeshes) {
    const skin = skinForMesh(decoded, meshInfo);
    const hasSkin = Boolean(skin && skin.jointNodes && skin.jointNodes.length);
    const geometry = exportGeometry(decoded, meshInfo, hasSkin ? skin : null, hasSkin ? 1 : 0);
    const material = exportMaterial(decoded, meshInfo);
    disposable.push(geometry, material);

    let mesh;
    if (hasSkin) {
      const staticBone = new THREE.Bone();
      staticBone.name = `static_${meshInfo.renderIndex}`;
      skeletonRoot.add(staticBone);
      const sourceBones = skin.jointNodes.map((node) => nodeObjects[node.index]).filter(Boolean);
      if (sourceBones.length !== skin.jointNodes.length) {
        throw new Error(`skin ${skin.index} references missing skeleton nodes`);
      }
      const sourceInverses = skin.inverseBindMatrices.slice(0, sourceBones.length).map((matrix) => matrix.clone());
      while (sourceInverses.length < sourceBones.length) {
        const bone = sourceBones[sourceInverses.length];
        sourceInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
      }
      const bones = [skeletonRoot, ...sourceBones, staticBone];
      const inverses = [new THREE.Matrix4(), ...sourceInverses, new THREE.Matrix4()];
      const skeleton = new THREE.Skeleton(bones, inverses);
      mesh = new THREE.SkinnedMesh(geometry, material);
      mesh.bind(skeleton, new THREE.Matrix4());
      mesh.normalizeSkinWeights();
      skinnedMeshCount += 1;
    } else {
      mesh = new THREE.Mesh(geometry, material);
    }
    mesh.name = `mesh_${meshInfo.renderIndex}_${String(meshInfo.name || "part").replace(/[^a-zA-Z0-9_-]+/g, "_")}`;
    root.add(mesh);
  }

  root.updateMatrixWorld(true);
  const clip = buildExportAnimationClip(decoded, pose, nodeObjects);
  return {
    root,
    clip,
    skinnedMeshCount,
    dispose() {
      for (const resource of disposable) resource.dispose();
    }
  };
}

function buildExportAnimationClip(decoded, pose, nodeObjects) {
  const animation = pose.animation;
  const frameCount = Math.max(1, animation.frameCount || 1);
  const frameRate = Math.max(1, animation.frameRate || 30);
  const sampleCount = frameCount + 1;
  const times = new Float32Array(sampleCount);
  const positions = decoded.nodes.map(() => new Float32Array(sampleCount * 3));
  const rotations = decoded.nodes.map(() => new Float32Array(sampleCount * 4));
  const scales = decoded.nodes.map(() => new Float32Array(sampleCount * 3));
  const inverseParent = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const previousRotations = decoded.nodes.map(() => null);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const frame = sampleIndex === frameCount ? (pose.menuLoopStart ?? 0) : sampleIndex;
    const globals = retargetedPoseGlobals(decoded, pose, frame);
    times[sampleIndex] = sampleIndex / frameRate;
    for (const node of decoded.nodes) {
      local.copy(globals[node.index] || decoded.globals[node.index]);
      if (Number.isInteger(node.parent) && globals[node.parent]) {
        inverseParent.copy(globals[node.parent]).invert();
        local.premultiply(inverseParent);
      }
      local.decompose(position, rotation, scale);
      const previous = previousRotations[node.index];
      if (previous && previous.dot(rotation) < 0) rotation.set(-rotation.x, -rotation.y, -rotation.z, -rotation.w);
      previousRotations[node.index] = rotation.clone();
      position.toArray(positions[node.index], sampleIndex * 3);
      rotation.toArray(rotations[node.index], sampleIndex * 4);
      scale.toArray(scales[node.index], sampleIndex * 3);
    }
  }

  const tracks = [];
  for (const node of decoded.nodes) {
    const target = nodeObjects[node.index].name;
    tracks.push(new THREE.VectorKeyframeTrack(`${target}.position`, times, positions[node.index]).optimize());
    tracks.push(new THREE.QuaternionKeyframeTrack(`${target}.quaternion`, times, rotations[node.index]).optimize());
    tracks.push(new THREE.VectorKeyframeTrack(`${target}.scale`, times, scales[node.index]).optimize());
  }
  return new THREE.AnimationClip(poseLabel(pose.path || "idle"), frameCount / frameRate, tracks);
}


export {parseGLB,buildExportScene};

function poseLabel(path) { return path.split("/").pop().replace(/\.glb$/, ""); }
