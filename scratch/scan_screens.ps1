Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path "docs/Desain/Admin/0. Mobile Admin.png"))

# Look at y = 100, 200, 300:
# The canvas background is dark gray (around RGB 50-70).
# The screens have white or light background (RGB > 200).
$bgY = 200
$rowPixels = @()
for ($x = 0; $x -lt $bmp.Width; $x += 4) {
    $c = $bmp.GetPixel($x, $bgY)
    if ($c.R -gt 150 -and $c.G -gt 150) {
        $rowPixels += $x
    }
}

# Group contiguous ranges
$ranges = @()
$start = -1
$prev = -1
foreach ($x in $rowPixels) {
    if ($start -eq -1) { $start = $x; $prev = $x }
    elseif ($x - $prev -le 8) { $prev = $x }
    else {
        $ranges += [PSCustomObject]@{ Start = $start; End = $prev; Width = ($prev - $start) }
        $start = $x
        $prev = $x
    }
}
if ($start -ne -1) {
    $ranges += [PSCustomObject]@{ Start = $start; End = $prev; Width = ($prev - $start) }
}

Write-Output "Found columns at y=${bgY}:"
$ranges | Format-Table

# Now for each column, find vertical range (y)
foreach ($r in $ranges) {
    $midX = [int](($r.Start + $r.End) / 2)
    $yStarts = @()
    for ($y = 0; $y -lt $bmp.Height; $y += 10) {
        $c = $bmp.GetPixel($midX, $y)
        if ($c.R -gt 150 -and $c.G -gt 150) {
            $yStarts += $y
        }
    }
    # group contiguous y
    $yRanges = @()
    $sY = -1; $pY = -1
    foreach ($y in $yStarts) {
        if ($sY -eq -1) { $sY = $y; $pY = $y }
        elseif ($y - $pY -le 25) { $pY = $y }
        else {
            $yRanges += [PSCustomObject]@{ Top = $sY; Bottom = $pY; Height = ($pY - $sY) }
            $sY = $y; $pY = $y
        }
    }
    if ($sY -ne -1) {
        $yRanges += [PSCustomObject]@{ Top = $sY; Bottom = $pY; Height = ($pY - $sY) }
    }
    Write-Output "Column X=($($r.Start)..$($r.End)): Y ranges:"
    $yRanges | Format-Table
}

$bmp.Dispose()
