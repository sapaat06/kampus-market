Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Kost/2. Role Kost.png"))
$outDir = "docs/desain-potong/kost"

function Crop($name, $x, $y, $w, $h) {
    $crop = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $crop.Save("$outDir/$name.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Output "Saved $name.png"
}

# Row 2 (around y: 2230 to 3030 or similar):
# Let's check row positions in 2. Role Kost.png (Height is 4859)
# Let's sample y coordinates
# In overview.png (h: 1320), Row 1 is 0..230, Row 2 is 600..830, Row 3 is 850..1100
# So in original (4859 / 1320 = 3.68):
# Row 2 y ~ 2220..3020
# Row 3 y ~ 3140..3940

Crop "06-manajemen-kamar" 480 2228 360 800
Crop "07-penyewa" 912 2228 360 800
Crop "08-detail-penyewa" 1344 2228 360 800
Crop "09-pengajuan-sewa" 1776 2228 360 800
Crop "10-detail-pengajuan" 48 3148 360 800
Crop "11-akun-pemilik-kost" 480 3148 360 800

$bmp.Dispose()
Write-Output "Cropped remaining screens!"
