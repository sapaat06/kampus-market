Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"))
$crop = New-Object System.Drawing.Bitmap 120, 120
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, 120, 120), (New-Object System.Drawing.Rectangle 498, 142, 54, 54), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$crop.Save("public/img/avatar-ayu-pratama.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$bmp.Dispose()
Write-Output "Perfect avatar extracted!"
