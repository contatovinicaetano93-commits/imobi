# Run once as Administrator to allow phone access over LAN.
netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="Expo Metro 8082" dir=in action=allow protocol=TCP localport=8082
netsh advfirewall firewall add rule name="Imbobi API 4000" dir=in action=allow protocol=TCP localport=4000
netsh advfirewall firewall add rule name="Imbobi API 4001" dir=in action=allow protocol=TCP localport=4001
Write-Host "Firewall rules added. Now run: pnpm dev:device"
