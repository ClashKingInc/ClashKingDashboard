import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Validate reminder time format and limits
const validateReminderTime = (time: string, type: string): { valid: boolean; error?: string } => {
  // Check format is "X hr" or "X.X hr"
  const regex = /^(\d+(?:\.\d+)?)\s+hr$/;
  const match = regex.exec(time);

  if (!match) {
    return { valid: false, error: "Time must be in format 'X hr' where X is a number" };
  }

  const hours = Number.parseFloat(match[1]);

  if (Number.isNaN(hours) || hours <= 0) {
    return { valid: false, error: "Time must be a positive number" };
  }

  // Check against type-specific limits
  let maxHours: number;
  switch (type) {
    case "War":
      maxHours = 48;
      break;
    case "Clan Games":
      maxHours = 336; // 2 weeks
      break;
    case "Clan Capital":
      maxHours = 168; // 1 week
      break;
    case "Inactivity":
      return { valid: true }; // No limit
    default:
      maxHours = 48;
  }

  if (hours > maxHours) {
    return { valid: false, error: `Time must be less than or equal to ${maxHours} hours for ${type} reminders` };
  }

  return { valid: true };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/reminders`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (GET /reminders):', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ server_id: string }> }
) {
  try {
    const { server_id } = await params;
    const token = request.headers.get('authorization');
    const body = await request.json();

    // Validate time format
    const validation = validateReminderTime(body.time, body.type);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/server/${server_id}/reminders`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error (POST /reminders):', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
