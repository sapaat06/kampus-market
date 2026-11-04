Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"))
# In original master (2208 x 4065):
# Col 2 is x=480..840, y=48..848
# Let's crop x: 480 + 20 = 500, y: 48 + 80 to 48 + 150
$crop = New-Object System.Drawing.Bitmap 120, 120
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
# Let's crop from master image directly so we get high resolution!
$g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, 120, 120), (New-Object System.Drawing.Rectangle 500, 134, 46, 54), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$crop.Save("public/img/avatar-ayu-pratama.png", [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$bmp.Dispose()
Write-Output "Extracted"
