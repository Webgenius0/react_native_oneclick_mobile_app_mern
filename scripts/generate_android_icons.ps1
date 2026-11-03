# PowerShell script to generate Android App Launcher Icons from src/assets/img/logo.png
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path "src/assets/img/logo.png").Path
$resBase = (Resolve-Path "android/app/src/main/res").Path

Write-Host "Source logo: $sourcePath"
Write-Host "Destination: $resBase"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source logo file not found at $sourcePath"
    exit 1
}

$sourceBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)

# Densities and sizes definition
$densities = @(
    @{ Name = "mipmap-ldpi";    IconSize = 36;  Round = $false; ForegroundSize = 0   },
    @{ Name = "mipmap-mdpi";    IconSize = 48;  Round = $true;  ForegroundSize = 108 },
    @{ Name = "mipmap-hdpi";    IconSize = 72;  Round = $true;  ForegroundSize = 162 },
    @{ Name = "mipmap-xhdpi";   IconSize = 96;  Round = $true;  ForegroundSize = 216 },
    @{ Name = "mipmap-xxhdpi";  IconSize = 144; Round = $true;  ForegroundSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; IconSize = 192; Round = $true;  ForegroundSize = 432 }
)

function Resize-SquareImage($src, $targetSize) {
    $dest = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $targetSize, $targetSize)
    $g.Dispose()
    return $dest
}

function Create-RoundImage($src, $targetSize) {
    $dest = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $targetSize, $targetSize)
    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $targetSize, $targetSize)
    $path.Dispose()
    $g.Dispose()
    return $dest
}

function Create-AdaptiveForeground($src, $canvasSize) {
    $dest = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # In Android adaptive icons, safe area is centered at ~72% of the 108dp canvas
    $contentSize = [int]($canvasSize * 0.72)
    $offset = [int](($canvasSize - $contentSize) / 2)

    $g.DrawImage($src, $offset, $offset, $contentSize, $contentSize)
    $g.Dispose()
    return $dest
}

foreach ($d in $densities) {
    $dir = Join-Path $resBase $d.Name
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # 1. Standard ic_launcher.png
    $icon = Resize-SquareImage $sourceBmp $d.IconSize
    $iconPath = Join-Path $dir "ic_launcher.png"
    $icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $icon.Dispose()
    Write-Host "Created: $iconPath ($($d.IconSize)x$($d.IconSize))"

    # 2. Round ic_launcher_round.png
    if ($d.Round) {
        $roundIcon = Create-RoundImage $sourceBmp $d.IconSize
        $roundPath = Join-Path $dir "ic_launcher_round.png"
        $roundIcon.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $roundIcon.Dispose()
        Write-Host "Created: $roundPath ($($d.IconSize)x$($d.IconSize))"
    }

    # 3. Adaptive ic_launcher_foreground.png
    if ($d.ForegroundSize -gt 0) {
        $fgIcon = Create-AdaptiveForeground $sourceBmp $d.ForegroundSize
        $fgPath = Join-Path $dir "ic_launcher_foreground.png"
        $fgIcon.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $fgIcon.Dispose()
        Write-Host "Created: $fgPath ($($d.ForegroundSize)x$($d.ForegroundSize))"
    }
}

$sourceBmp.Dispose()
Write-Host "SUCCESS: All Android launcher icons generated successfully!"
