# Badge images

The URL helper emits PNG with an explicit size (128 by default for dashboard icons). It supports small, medium, large, 64, 128, 256, and 512 and an explicit AVIF format. AppImage and AvatarImage offer AVIF through a picture source, with PNG for browsers without AVIF support. They normalize legacy badges.clashk.ing URLs from API responses and retain only size in the query. Other asset hosts are unchanged.
