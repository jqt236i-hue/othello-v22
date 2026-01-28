param(
  [string]$Remote = "origin",
  [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Stop"

function Ensure-Remote {
  param([string]$Name, [string]$Url)
  $existing = git remote | Where-Object { $_ -eq $Name }
  if ($existing) { return }
  if (-not $Url) {
    $Url = Read-Host "Remote '$Name' not found. Enter remote URL (e.g. git@github.com:OWNER/REPO.git)"
  }
  if (-not $Url) { throw "Remote URL is required." }
  git remote add $Name $Url | Out-Null
}

function New-BranchFrom {
  param([string]$Branch, [string]$BaseRef)
  $exists = git show-ref --verify --quiet ("refs/heads/{0}" -f $Branch)
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Branch exists: $Branch"
    return
  }
  git checkout -b $Branch $BaseRef | Out-Null
  Write-Host "Created branch: $Branch (from $BaseRef)"
}

function CherryPick {
  param([string[]]$Commits)
  foreach ($c in $Commits) {
    Write-Host "Cherry-pick: $c"
    git cherry-pick $c
  }
}

function Push-Branch {
  param([string]$Name, [string]$RemoteName)
  Write-Host "Pushing $Name -> $RemoteName"
  git push -u $RemoteName $Name
}

# Commit anchors in this repo (turn-manager PR chain)
$BASE = "ea14711" # before PR#1
$PR1 = "c20d4ca"  # requestUIRender helper + tests
$PR2 = "840d601"  # DRAW_CARD event + tests
$PR3a = "7f4f043" # notifier introduction
$PR3b = "e8c448e" # notifier rename/fixups
$PR4 = "f4a3174"  # PLAY_HAND_ANIMATION event + tests

Ensure-Remote -Name $Remote -Url $RemoteUrl

# PR#1
New-BranchFrom -Branch "refactor/turn-render-unify" -BaseRef $BASE
CherryPick -Commits @($PR1)
Push-Branch -Name "refactor/turn-render-unify" -RemoteName $Remote

# PR#2
New-BranchFrom -Branch "feat/turn-draw-event" -BaseRef "refactor/turn-render-unify"
CherryPick -Commits @($PR2)
Push-Branch -Name "feat/turn-draw-event" -RemoteName $Remote

# PR#3 (includes the follow-up fix commit)
New-BranchFrom -Branch "refactor/ui-notifier" -BaseRef "feat/turn-draw-event"
CherryPick -Commits @($PR3a, $PR3b)
Push-Branch -Name "refactor/ui-notifier" -RemoteName $Remote

# PR#4
New-BranchFrom -Branch "feat/play-hand-event" -BaseRef "refactor/ui-notifier"
CherryPick -Commits @($PR4)
Push-Branch -Name "feat/play-hand-event" -RemoteName $Remote

Write-Host ""
Write-Host "Done. Create PRs in this order:"
Write-Host "1) refactor/turn-render-unify -> base branch"
Write-Host "2) feat/turn-draw-event -> refactor/turn-render-unify"
Write-Host "3) refactor/ui-notifier -> feat/turn-draw-event"
Write-Host "4) feat/play-hand-event -> refactor/ui-notifier"

