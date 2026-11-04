Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Kost/2. Role Kost.png"))
Write-Output "Image size: $($bmp.Width) x $($bmp.Height)"

$outDir = "docs/desain-potong/kost"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

$thumbW = 600
$thumbH = [int]($bmp.Height * ($thumbW / $bmp.Width))
$thumb = New-Object System.Drawing.Bitmap $thumbW, $thumbH
$g = [System.Drawing.Graphics]::FromImage($thumb)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, 0, 0, $thumbW, $thumbH)
$g.Dispose()

$thumb.Save("$outDir/overview.png", [System.Drawing.Imaging.ImageFormat]::Png)
$thumb.Dispose()
$bmp.Dispose()
Write-Output "Saved overview to $outDir/overview.png ($thumbW x $thumbH)"
