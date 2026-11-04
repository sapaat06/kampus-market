Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"))
Write-Output "Image size: $($bmp.Width) x $($bmp.Height)"

# Let's inspect where screens are located.
# Mobile screens in Figma are typically 360 x 800 (or scaled like 720x1600 or similar).
# Let's find top-left and dimensions of typical screens.
$bmp.Dispose()
