Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Kost/2. Role Kost.png"))

# Look at overview.png:
# Row 1 is at y ~ 48 to 848 (h: 800, w: 360)
# Screen 1 (Beranda): Col 2 -> x: 480, y: 48
# Screen 2 (Properti): Col 3 -> x: 912, y: 48
# Screen 3 (Detail Properti): Col 4 -> x: 1344, y: 48
# Screen 4 (Tambah Properti): Col 5 -> x: 1776, y: 48

$outDir = "docs/desain-potong/kost"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

function Crop($name, $x, $y, $w, $h) {
    $crop = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $crop.Save("$outDir/$name.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Output "Saved $name.png"
}

Crop "01-beranda-kost" 480 48 360 800
Crop "02-properti-kost" 912 48 360 800
Crop "03-detail-properti" 1344 48 360 800
Crop "04-tambah-properti" 1776 48 360 800

$bmp.Dispose()
Write-Output "Cropped top screens!"
