# PowerShell script to generate iOS App Launcher Icons from src/assets/img/logo.png
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path "src/assets/img/logo.png").Path
$iosIconDir = (Resolve-Path "ios/OneClickToShop/Images.xcassets/AppIcon.appiconset").Path

Write-Host "Source logo: $sourcePath"
Write-Host "Destination: $iosIconDir"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source logo file not found at $sourcePath"
    exit 1
}

$sourceBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)

$iosIcons = @(
    @{ Name = "Icon-App-20x20@1x.png";     Width = 20;   Height = 20   },
    @{ Name = "Icon-App-20x20@2x.png";     Width = 40;   Height = 40   },
    @{ Name = "Icon-App-20x20@3x.png";     Width = 60;   Height = 60   },
    @{ Name = "Icon-App-29x29@1x.png";     Width = 29;   Height = 29   },
    @{ Name = "Icon-App-29x29@2x.png";     Width = 58;   Height = 58   },
    @{ Name = "Icon-App-29x29@3x.png";     Width = 87;   Height = 87   },
    @{ Name = "Icon-App-40x40@1x.png";     Width = 40;   Height = 40   },
    @{ Name = "Icon-App-40x40@2x.png";     Width = 80;   Height = 80   },
    @{ Name = "Icon-App-40x40@3x.png";     Width = 120;  Height = 120  },
    @{ Name = "Icon-App-60x60@2x.png";     Width = 120;  Height = 120  },
    @{ Name = "Icon-App-60x60@3x.png";     Width = 180;  Height = 180  },
    @{ Name = "Icon-App-76x76@1x.png";     Width = 76;   Height = 76   },
    @{ Name = "Icon-App-76x76@2x.png";     Width = 152;  Height = 152  },
    @{ Name = "Icon-App-83.5x83.5@2x.png"; Width = 167;  Height = 167  },
    @{ Name = "ItunesArtwork@2x.png";      Width = 1024; Height = 1024 }
)

function Resize-Image($src, $w, $h) {
    # 24bpp RGB to prevent alpha channel rejection on App Store
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    return $dest
}

foreach ($item in $iosIcons) {
    $targetPath = Join-Path $iosIconDir $item.Name
    $resized = Resize-Image $sourceBmp $item.Width $item.Height
    $resized.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    Write-Host "Created: $targetPath ($($item.Width)x$($item.Height))"
}

$sourceBmp.Dispose()
Write-Host "SUCCESS: All iOS app icons generated successfully!"
