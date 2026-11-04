Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/desain-potong/admin/01-beranda-admin.png"))
# Let's crop Ayu Pratama avatar (circle around x: 20, y: 130, size: 50x50)
# Find exact bounds of the avatar
$crop = New-Object System.Drawing.Bitmap 52, 52
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, 52, 52), (New-Object System.Drawing.Rectangle 20, 134, 42, 42), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$crop.Save("public/img/avatar-ayu-pratama.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$bmp.Dispose()
Write-Output "Extracted avatar-ayu-pratama.png"
