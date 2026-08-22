param(
    [Parameter(Mandatory = $true)][string]$ApiUrl,
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][ValidateSet('free', 'single', 'pro', 'power')][string]$Plan
)

$adminKey = $env:LICENSE_ADMIN_KEY
if ([string]::IsNullOrWhiteSpace($adminKey)) {
    throw 'Set LICENSE_ADMIN_KEY in your environment before issuing a license.'
}

$headers = @{ 'X-Admin-Key' = $adminKey }
$payload = @{ email = $Email; plan_id = $Plan } | ConvertTo-Json
$endpoint = $ApiUrl.TrimEnd('/') + '/v1/admin/licenses/issue'
$result = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json' -Body $payload
$result.license | Format-List id, tier, max_devices, key
