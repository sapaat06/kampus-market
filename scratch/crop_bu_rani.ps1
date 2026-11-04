Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Kost/2. Role Kost.png"))
# Col 2 is x=480..840, y=48..848
$crop = New-Object System.Drawing.Bitmap 120, 120
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, 120, 120), (New-Object System.Drawing.Rectangle 498, 142, 54, 54), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$crop.Save("public/img/avatar-bu-rani.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$bmp.Dispose()
Write-Output "Extracted avatar-bu-rani.png"
