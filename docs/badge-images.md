# Badge images

The URL helper emits PNG with an explicit named size (`medium` by default for dashboard icons). It uses `small`, `medium`, and `large` and an explicit AVIF format. AppImage and AvatarImage offer AVIF through a picture source, with PNG for browsers without AVIF support. They normalize legacy `badges.clashk.ing` URLs (including numeric sizes) into `small`, `medium`, or `large` and retain only `size` in the query. Other asset hosts are unchanged.
