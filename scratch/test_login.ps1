try {
    $body = @{
        kod = "Z1"
        sifre = "123"
        dil = "tr"
    } | ConvertTo-Json
    $res = Invoke-WebRequest -Uri "https://1click.thesyndicates.team/api/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Output "LOGIN STATUS: $($res.StatusCode)"
    Write-Output "LOGIN BODY: $($res.Content)"

    $json = $res.Content | ConvertFrom-Json
    if ($json.s.token) {
        $token = $json.s.token
        Write-Output "GOT TOKEN: $token"
        $homeBody = @{
            token = $token
            ulkeID = 0
        } | ConvertTo-Json
        $homeRes = Invoke-WebRequest -Uri "https://1click.thesyndicates.team/api/home" -Method Post -Body $homeBody -ContentType "application/json" -Headers @{ token = $token; Authorization = $token } -TimeoutSec 10
        Write-Output "HOME STATUS: $($homeRes.StatusCode)"
        Write-Output "HOME BODY: $($homeRes.Content.Substring(0, [Math]::Min(300, $homeRes.Content.Length)))"
    }
} catch {
    Write-Output "LOGIN EXCEPTION: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Output "ERROR_BODY: $($reader.ReadToEnd())"
    }
}
