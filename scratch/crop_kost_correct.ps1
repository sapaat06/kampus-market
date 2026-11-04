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

Crop "06-manajemen-kamar" 480 3020 360 800
Crop "07-penyewa" 912 3020 360 800
Crop "08-detail-penyewa" 1344 3020 360 800
Crop "09-pengajuan-sewa" 1776 3020 360 800
Crop "10-detail-pengajuan" 48 3940 360 800
Crop "11-akun-pemilik-kost" 480 3940 360 800

$bmp.Dispose()
Write-Output "Done"
