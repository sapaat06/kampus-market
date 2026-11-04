Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"))

# Look at overview.png: width is 2208, height is 4065.
# Let's see how many columns:
# Notice columns across width 2208:
# Column 1: Dialogs on left
# Column 2: Beranda
# Column 3: Verifikasi
# Column 4: Detail Mahasiswa
# Column 5: Preview KTM
# In row 1: there are 5 columns! 2208 / 5 is ~400-440px wide per column!
# Let's inspect pixel colors across row y = 200, 300, 500 etc.

# Let's write a python or node or ps1 script to find distinct screen bounds.
$outDir = "docs/desain-potong/admin"

# Let's sample a few columns in Row 1:
# Let's find white card boundaries
function Save-Crop($name, $x, $y, $w, $h) {
    $crop = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $crop.Save("$outDir/$name.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $crop.Dispose()
    Write-Output "Saved $name ($w x $h) at ($x, $y)"
}

# Let's test a couple crops
$bmp.Dispose()
