
param(
    [ValidateSet("install", "infra", "migrate", "api", "worker", "web", "up", "down", "status", "db")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Api = Join-Path $Root "apps\api"
$Web = Join-Path $Root "apps\web"
$Python = Join-Path $Api "venv\Scripts\python.exe"
$PidFile = Join-Path $Root ".dev-processes.json"

function Start-Infra {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    docker info 2>&1 | Out-Null
    $dockerExitCode = $LASTEXITCODE

    $ErrorActionPreference = $previousPreference

    if ($dockerExitCode -ne 0) {
        throw "Inicia Docker Desktop antes de continuar."
    }

    $containers = @(
        @{
            Name = "resumedoc_db"
            Args = @("--name", "resumedoc_db", "-p", "5434:5432",
                "-e", "POSTGRES_USER=resumedoc",
                "-e", "POSTGRES_PASSWORD=resumedoc",
                "-e", "POSTGRES_DB=resumedoc",
                "-v", "resumedoc_pgdata:/var/lib/postgresql/data",
                "postgres:17")
        },
        @{
            Name = "resumedoc_redis"
            Args = @("--name", "resumedoc_redis", "-p", "6379:6379", "redis:7")
        }
    )

    foreach ($container in $containers) {
        docker container inspect $container.Name *> $null

        if ($LASTEXITCODE -eq 0) {
            docker start $container.Name | Out-Null
        }
        else {
            docker run -d @($container.Args) | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "No se pudo crear $($container.Name)."
            }
        }
    }

    Write-Host "Esperando PostgreSQL..."
    $ready = $false

    for ($i = 0; $i -lt 30; $i++) {
        docker exec resumedoc_db pg_isready -U resumedoc -d resumedoc *> $null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep 2
    }

    if (-not $ready) {
        throw "PostgreSQL no está disponible."
    }

    Write-Host "Infraestructura lista." -ForegroundColor Green
}

function Load-ApiEnv {
    $envFile = Join-Path $Api ".env"

    if (-not (Test-Path $envFile)) {
        throw "No existe apps\api\.env."
    }

    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()

        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line -split "=", 2
            $key = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")

            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }

    $env:PYTHONPATH = $Root
}

function Open-DatabaseConsole {
    Load-ApiEnv

    if (-not $env:DATABASE_URL) {
        throw "No se ha encontrado DATABASE_URL en apps\api\.env."
    }

    try {
        $connection = [Uri]$env:DATABASE_URL
    }
    catch {
        throw "No se ha podido interpretar DATABASE_URL. Comprueba apps\api\.env."
    }

    $dbUser = [Uri]::UnescapeDataString($connection.UserInfo.Split(":")[0])
    $dbPassword = ""
    $dbName = [Uri]::UnescapeDataString($connection.AbsolutePath.TrimStart("/"))
    $dbHost = $connection.Host
    $dbPort = $connection.Port

    if ($connection.UserInfo.Contains(":")) {
        $dbPassword = [Uri]::UnescapeDataString(
            $connection.UserInfo.Substring($connection.UserInfo.IndexOf(":") + 1)
        )
    }

    # Si la conexión apunta al PostgreSQL de nuestro Docker local,
    # entramos directamente en el contenedor.
    $dockerDb = $false

    if (($dbHost -eq "localhost" -or $dbHost -eq "127.0.0.1") -and $dbPort -eq 5434) {
        docker ps --filter "name=^/resumedoc_db$" --format "{{.Names}}" 2>$null |
            ForEach-Object {
                if ($_ -eq "resumedoc_db") { $dockerDb = $true }
            }
    }

    if ($dockerDb) {
        Write-Host "Conectando al PostgreSQL de Docker..." -ForegroundColor Green
        docker exec -it resumedoc_db psql -U $dbUser -d $dbName
        return
    }

    # Si PostgreSQL está instalado directamente en el equipo,
    # utilizamos el cliente psql de Windows.
    $psql = Get-Command psql -ErrorAction SilentlyContinue

    if (-not $psql) {
        throw "No se encuentra psql. Instala el cliente de PostgreSQL o añade su carpeta bin al PATH."
    }

    Write-Host "Conectando a PostgreSQL en $dbHost`:$dbPort..." -ForegroundColor Green

    $previousPassword = $env:PGPASSWORD
    $env:PGPASSWORD = $dbPassword

    try {
        & $psql.Source -h $dbHost -p $dbPort -U $dbUser -d $dbName
    }
    finally {
        $env:PGPASSWORD = $previousPassword
    }
}


function Start-ProcessTerminal($Task) {
    $script = Join-Path $Root "dev.ps1"

    $process = Start-Process powershell.exe `
        -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-File", "`"$script`"",
            $Task
        ) `
        -WorkingDirectory $Root `
        -PassThru

    return $process.Id
}

switch ($Action) {

    "install" {
        Set-Location $Root

        npm install
        if ($LASTEXITCODE -ne 0) { throw "Error instalando dependencias npm." }

        if (-not (Test-Path $Python)) {
            python -m venv (Join-Path $Api "venv")
        }

        & $Python -m pip install --upgrade pip
        & $Python -m pip install -r (Join-Path $Api "requirements.txt")

        Write-Host "Instalación completada."
    }

    "infra" {
        Start-Infra
    }

    "migrate" {
        Load-ApiEnv
        Set-Location $Root
        & $Python -m alembic upgrade head

        if ($LASTEXITCODE -ne 0) {
            throw "Error ejecutando las migraciones."
        }
    }

    "api" {
        Load-ApiEnv
        Set-Location $Api
        & $Python -m uvicorn src.main:app --reload
    }

    "worker" {
        Load-ApiEnv
        Set-Location $Api
        & $Python -m celery -A src.worker:celery_app worker --pool=solo --concurrency=1 --loglevel=info 
    }

    "web" {
        Set-Location $Web
        npm run dev
    }

    "up" {
        Start-Infra

        & $PSCommandPath migrate
        if ($LASTEXITCODE -ne 0) {
            throw "No se pudieron aplicar las migraciones."
        }

        $ids = @()
        $ids += Start-ProcessTerminal "api"
        $ids += Start-ProcessTerminal "worker"
        $ids += Start-ProcessTerminal "web"

        $ids | ConvertTo-Json | Set-Content $PidFile

        Write-Host "ResumeDoc está iniciándose."
        Write-Host "Frontend: http://localhost:5173"
        Write-Host "Backend:  http://localhost:8000/docs"
    }

    
    "down" {
        if (Test-Path $PidFile) {
            $pidText = Get-Content $PidFile -Raw

            # Extraer los identificadores numéricos del archivo
            $ids = [regex]::Matches($pidText, '\d+') |
                ForEach-Object { [int]$_.Value }

            foreach ($processId in $ids) {
                $previousPreference = $ErrorActionPreference
                $ErrorActionPreference = "Continue"

                & "$env:SystemRoot\System32\taskkill.exe" /PID $processId /T /F 2>&1 | Out-Null

                $ErrorActionPreference = $previousPreference
            }

            Remove-Item $PidFile -Force
        }

        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"

        docker stop resumedoc_db resumedoc_redis 2>&1 | Out-Null

        $ErrorActionPreference = $previousPreference

        Write-Host "Servicios detenidos. Los datos de PostgreSQL se conservan."
    }

    "status" {
        docker ps
    }

    "db" {
        Open-DatabaseConsole
    }
}
