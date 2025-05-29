# Script to run GitHub Actions workflows locally using act

# Check if act is installed
$actExists = Get-Command act -ErrorAction SilentlyContinue
if (-not $actExists) {
    Write-Host "The 'act' tool is not installed. Installing it now..."
    
    # Check if chocolatey is installed
    $chocoExists = Get-Command choco -ErrorAction SilentlyContinue
    if (-not $chocoExists) {
        Write-Host "Chocolatey is not installed. Please install it first by running:"
        Write-Host "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
        exit 1
    }
    
    # Install act using chocolatey
    choco install act-cli -y
}

# Show available workflows
Write-Host "Available workflows:"
Get-ChildItem -Path ".github/workflows" -Filter "*.yml" | ForEach-Object {
    Write-Host "- $($_.Name)"
}

# Prompt user to select a workflow
$workflowName = Read-Host "Enter the name of the workflow to run (e.g., ci.yml)"
$workflowPath = ".github/workflows/$workflowName"

if (-not (Test-Path $workflowPath)) {
    Write-Host "Workflow file not found: $workflowPath"
    exit 1
}

# Run the selected workflow with act
Write-Host "Running workflow: $workflowName"
act -W $workflowPath

Write-Host "Workflow execution completed."
