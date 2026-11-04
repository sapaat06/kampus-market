Add-Type -AssemblyName System.Drawing
$imgPath = Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
Write-Output "Image size: $($bmp.Width) x $($bmp.Height)"

# Let's save a downscaled thumbnail to see what screens are on the board
$thumbW = 600
$thumbH = [int]($bmp.Height * ($thumbW / $bmp.Width))
$thumb = New-Object System.Drawing.Bitmap $thumbW, $thumbH
$g = [System.Drawing.Graphics]::FromImage($thumb)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, 0, 0, $thumbW, $thumbH)
$g.Dispose()

$outDir = "docs/desain-potong/admin"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }
$thumb.Save("$outDir/overview.png", [System.Drawing.Imaging.ImageFormat]::Png)
$thumb.Dispose()
$bmp.Dispose()
Write-Output "Saved overview to $outDir/overview.png ($thumbW x $thumbH)"
