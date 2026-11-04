Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"))
$outDir = "docs/desain-potong/admin"
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

# Row 1 (y = 48, h = 800, w = 360)
Crop "01-beranda-admin" 480 48 360 800
Crop "02-verifikasi-mahasiswa" 912 48 360 800
Crop "03-detail-mahasiswa" 1344 48 360 800
Crop "04-preview-ktm" 1776 48 360 800

# Row 2 (y = 2228, h = 800, w = 360)
Crop "05-persetujuan-mahasiswa" 48 2228 360 800
Crop "06-penolakan-mahasiswa" 480 2228 360 800
Crop "07-green-point" 912 2228 360 800
Crop "08-moderasi-produk" 1344 2228 360 800
Crop "09-tolak-produk" 1776 2228 360 800

# Row 3 (y = 3148, h = 800, w = 360)
Crop "10-verifikasi-kost" 48 3148 360 800
Crop "11-detail-kost" 480 3148 360 800
Crop "12-notifikasi" 912 3148 360 800
Crop "13-akun-admin" 1344 3148 360 800

# Cards / dialogs on top left
Crop "14-dialog-cards" 48 48 360 1950

$bmp.Dispose()
Write-Output "All cropped successfully!"
