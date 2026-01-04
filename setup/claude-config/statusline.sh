#!/bin/bash
# Yoyo Dev Status Line for Claude Code
# Professional statusline showing project context, spec, and progress
#
# Format: PROJECT_NAME v0.0.0 | Tech: X, Y | Spec: name | Tasks: X/Y | Orch: ON
#
# All key info in yellow/orange for visibility

set -euo pipefail

# Colors (ANSI escape codes)
YELLOW='\033[1;33m'      # Bold yellow for project name
ORANGE='\033[0;33m'      # Orange for secondary items
CYAN='\033[0;36m'        # Cyan for spec name
GREEN='\033[0;32m'       # Green for completed tasks
DIM='\033[2m'            # Dim for separators
BOLD='\033[1m'           # Bold
RESET='\033[0m'

# Get project name from package.json or directory name
get_project_name() {
    local name
    if [[ -f "package.json" ]]; then
        name=$(grep -m1 '"name"' package.json 2>/dev/null | sed 's/.*"name"[^"]*"\([^"]*\)".*/\1/' | sed 's/@[^/]*\///')
        if [[ -n "$name" && "$name" != "name" ]]; then
            echo "$name"
            return
        fi
    fi
    # Fallback to directory name
    basename "$(pwd)"
}

# Get version from package.json or config.yml
get_version() {
    local version
    if [[ -f "package.json" ]]; then
        version=$(grep -m1 '"version"' package.json 2>/dev/null | sed 's/.*"version"[^"]*"\([^"]*\)".*/\1/')
        if [[ -n "$version" && "$version" != "version" ]]; then
            echo "v$version"
            return
        fi
    fi
    if [[ -f ".yoyo-dev/config.yml" ]]; then
        version=$(grep -m1 'yoyo_dev_version' .yoyo-dev/config.yml 2>/dev/null | sed 's/.*: *//')
        if [[ -n "$version" ]]; then
            echo "v$version"
            return
        fi
    fi
    echo ""
}

# Get primary tech stack (framework + database + styling)
get_tech_stack() {
    local techs=()

    # Check for common technologies
    if [[ -f "package.json" ]]; then
        local pkg_content
        pkg_content=$(cat package.json 2>/dev/null)

        # Framework detection
        if echo "$pkg_content" | grep -q '"react"'; then
            techs+=("React")
        elif echo "$pkg_content" | grep -q '"vue"'; then
            techs+=("Vue")
        elif echo "$pkg_content" | grep -q '"@angular/core"'; then
            techs+=("Angular")
        elif echo "$pkg_content" | grep -q '"svelte"'; then
            techs+=("Svelte")
        fi

        # TypeScript
        if echo "$pkg_content" | grep -q '"typescript"'; then
            techs+=("TS")
        fi

        # Styling
        if echo "$pkg_content" | grep -q '"tailwindcss"'; then
            techs+=("Tailwind")
        elif echo "$pkg_content" | grep -q '"styled-components"'; then
            techs+=("SC")
        fi

        # Database/Backend
        if echo "$pkg_content" | grep -q '"convex"'; then
            techs+=("Convex")
        elif echo "$pkg_content" | grep -q '"prisma"'; then
            techs+=("Prisma")
        elif echo "$pkg_content" | grep -q '"drizzle-orm"'; then
            techs+=("Drizzle")
        fi

        # Testing
        if echo "$pkg_content" | grep -q '"vitest"'; then
            techs+=("Vitest")
        elif echo "$pkg_content" | grep -q '"jest"'; then
            techs+=("Jest")
        fi
    fi

    # Python detection
    if [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]]; then
        techs+=("Python")
    fi

    # Limit to first 3 techs for brevity
    local result=""
    local count=0
    for tech in "${techs[@]}"; do
        if [[ $count -ge 3 ]]; then
            break
        fi
        if [[ -n "$result" ]]; then
            result+=", "
        fi
        result+="$tech"
        ((count++))
    done

    if [[ -z "$result" ]]; then
        echo "n/a"
    else
        echo "$result"
    fi
}

# Get active spec name (first non-completed spec by date, matching orchestration hook logic)
get_spec() {
    local spec_dir spec_name state_file current_phase
    if [[ -d ".yoyo-dev/specs" ]]; then
        # Sort directories in reverse order (newest date first) and find first non-completed
        for spec_dir in $(ls -1d .yoyo-dev/specs/*/ 2>/dev/null | sort -r); do
            state_file="${spec_dir}state.json"
            if [[ -f "$state_file" ]]; then
                # Check if current_phase is NOT "completed"
                current_phase=$(grep -o '"current_phase"[[:space:]]*:[[:space:]]*"[^"]*"' "$state_file" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/')
                if [[ -n "$current_phase" && "$current_phase" != "completed" ]]; then
                    spec_name=$(basename "$spec_dir")
                    # Remove date prefix (YYYY-MM-DD-)
                    spec_name=$(echo "$spec_name" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
                    # Truncate if too long (max 25 chars)
                    if [[ ${#spec_name} -gt 25 ]]; then
                        spec_name="${spec_name:0:22}..."
                    fi
                    echo "$spec_name"
                    return
                fi
            else
                # No state.json means spec is in progress (not yet started = not completed)
                spec_name=$(basename "$spec_dir")
                # Remove date prefix (YYYY-MM-DD-)
                spec_name=$(echo "$spec_name" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
                # Truncate if too long (max 25 chars)
                if [[ ${#spec_name} -gt 25 ]]; then
                    spec_name="${spec_name:0:22}..."
                fi
                echo "$spec_name"
                return
            fi
        done
    fi
    echo "none"
}

# Get task progress from most recent spec
get_tasks() {
    local tasks_file total_items completed_items
    if [[ -d ".yoyo-dev/specs" ]]; then
        tasks_file=$(ls -1t .yoyo-dev/specs/*/tasks.md 2>/dev/null | head -1)
        if [[ -n "$tasks_file" && -f "$tasks_file" ]]; then
            # Count checkbox items
            total_items=$(grep -cE '^\s*-\s*\[[x ]\]' "$tasks_file" 2>/dev/null) || total_items=0
            completed_items=$(grep -cE '^\s*-\s*\[x\]' "$tasks_file" 2>/dev/null) || completed_items=0

            # If no checkboxes, count task headers
            if [[ "$total_items" == "0" ]]; then
                total_items=$(grep -cE '^###\s+[0-9]+\.|^###\s+Task\s+[0-9]+' "$tasks_file" 2>/dev/null) || total_items=0
                completed_items=$(grep -cE '^###.*\[x\]|^###.*\(done\)' "$tasks_file" 2>/dev/null) || completed_items=0
            fi

            echo "${completed_items}/${total_items}"
            return
        fi
    fi
    echo "0/0"
}

# Get orchestration status
get_orchestration() {
    local orch_enabled="OFF"

    if [[ -f ".yoyo-dev/config.yml" ]]; then
        # Check if global orchestration is enabled
        if grep -qE '^\s*enabled:\s*true' .yoyo-dev/config.yml 2>/dev/null && \
           grep -qE '^\s*global_mode:\s*true' .yoyo-dev/config.yml 2>/dev/null; then
            orch_enabled="ON"
        fi
    fi

    # Check env override
    if [[ "${YOYO_ORCHESTRATION:-}" == "false" ]]; then
        orch_enabled="OFF"
    fi

    echo "$orch_enabled"
}

# Get git branch (compact)
get_branch() {
    local branch
    branch=$(git branch --show-current 2>/dev/null) || branch=""
    if [[ -z "$branch" ]]; then
        echo ""
    else
        # Truncate if too long
        if [[ ${#branch} -gt 15 ]]; then
            echo "${branch:0:12}..."
        else
            echo "$branch"
        fi
    fi
}

# Build status line
main() {
    local project version tech spec tasks orch branch

    project=$(get_project_name)
    version=$(get_version)
    tech=$(get_tech_stack)
    spec=$(get_spec)
    tasks=$(get_tasks)
    orch=$(get_orchestration)
    branch=$(get_branch)

    # Format: PROJECT v0.0.0 | Tech: X, Y | [branch] Spec: name | Tasks: X/Y | Orch: ON

    # Project name + version (bold yellow)
    printf "${YELLOW}${BOLD}%s${RESET}" "$project"
    if [[ -n "$version" ]]; then
        printf " ${DIM}%s${RESET}" "$version"
    fi

    # Tech stack (orange)
    printf " ${DIM}|${RESET} "
    printf "${ORANGE}%s${RESET}" "$tech"

    # Git branch (if present)
    if [[ -n "$branch" ]]; then
        printf " ${DIM}|${RESET} "
        printf "${DIM}[${RESET}${CYAN}%s${RESET}${DIM}]${RESET}" "$branch"
    fi

    # Active spec (cyan)
    printf " ${DIM}|${RESET} "
    printf "Spec: ${CYAN}%s${RESET}" "$spec"

    # Task progress (green for completed)
    printf " ${DIM}|${RESET} "
    printf "Tasks: ${GREEN}%s${RESET}" "$tasks"

    # Orchestration status
    printf " ${DIM}|${RESET} "
    if [[ "$orch" == "ON" ]]; then
        printf "Orch: ${GREEN}%s${RESET}" "$orch"
    else
        printf "Orch: ${DIM}%s${RESET}" "$orch"
    fi
}

main
