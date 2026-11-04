Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Kost/2. Role Kost.png"))

# Let's inspect column x = 500 across y
$whites = @()
for ($y = 0; $y -lt $bmp.Height; $y += 20) {
    $c = $bmp.GetPixel(500, $y)
    if ($c.R -gt 200 -and $c.G -gt 200) {
        $whites += $y
    }
}
Write-Output "White points at x=500:"
$whites
$bmp.Dispose()
