Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/desain-potong/admin/10-verifikasi-kost.png"))
$crop = New-Object System.Drawing.Bitmap 308, 150
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, 308, 150), (New-Object System.Drawing.Rectangle 26, 268, 308, 150), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$crop.Save("public/img/kos-ananda-dago.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$bmp.Dispose()
Write-Output "Clean photo extracted!"
