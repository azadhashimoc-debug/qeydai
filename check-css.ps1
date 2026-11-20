$r = Invoke-WebRequest -Uri "http://localhost:3000/az/panel" -UseBasicParsing
$r.Content | sls '\.css' -AllMatches | Select-Object -First 50
