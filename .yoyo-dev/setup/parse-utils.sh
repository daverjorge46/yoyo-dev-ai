#!/bin/sh

# Yoyo Dev - Shared Parsing Utilities
# Provides cached parsing functions for mission and tech stack extraction
# POSIX-compliant (no bashisms)

# Cache configuration
CACHE_DIR=".yoyo-dev/.cache/project-context"
CACHE_TTL=3600  # 1 hour in seconds

# Ensure cache directory exists
_ensure_cache_dir() {
    if [ ! -d "$CACHE_DIR" ]; then
        mkdir -p "$CACHE_DIR" 2>/dev/null || true
    fi
}

# Check if cache is valid (exists and not expired)
# Args: $1 = cache file path, $2 = source file path (optional)
_is_cache_valid() {
    local cache_file="$1"
    local source_file="$2"

    # Cache file must exist
    if [ ! -f "$cache_file" ]; then
        return 1
    fi

    # Check if cache is older than TTL
    if [ -n "$(find "$cache_file" -mmin +60 2>/dev/null)" ]; then
        # Cache is older than 60 minutes (1 hour)
        return 1
    fi

    # If source file provided, check if it's newer than cache
    if [ -n "$source_file" ] && [ -f "$source_file" ]; then
        if [ "$source_file" -nt "$cache_file" ]; then
            # Source file is newer than cache
            return 1
        fi
    fi

    # Cache is valid
    return 0
}

# Read from cache
# Args: $1 = cache file path
_read_cache() {
    local cache_file="$1"
    if [ -f "$cache_file" ]; then
        cat "$cache_file"
        return 0
    fi
    return 1
}

# Write to cache
# Args: $1 = cache file path, $2 = content
_write_cache() {
    local cache_file="$1"
    local content="$2"

    _ensure_cache_dir
    printf "%s" "$content" > "$cache_file" 2>/dev/null || true
}

# Extract project mission from mission-lite.md
# Returns: Mission string or fallback default
get_project_mission() {
    local cache_file="$CACHE_DIR/mission"
    local source_file=".yoyo-dev/product/mission-lite.md"
    local mission=""

    # Check cache first
    if _is_cache_valid "$cache_file" "$source_file"; then
        mission=$(_read_cache "$cache_file")
        if [ -n "$mission" ]; then
            printf "%s" "$mission"
            return 0
        fi
    fi

    # Parse from source file
    if [ -f "$source_file" ]; then
        mission=$(sed -n '/^## Mission/,/^##/p' "$source_file" 2>/dev/null | \
                  sed '1d;$d' | \
                  grep -v '^[[:space:]]*$' | \
                  head -n 1 | \
                  sed 's/^[[:space:]]*//' || true)
    fi

    # Fallback to default if empty
    if [ -z "$mission" ]; then
        mission="AI-assisted development workflow"
    fi

    # Cache the result
    _write_cache "$cache_file" "$mission"

    printf "%s" "$mission"
}

# Extract tech stack from mission-lite.md or tech-stack.md
# Returns: Tech stack string or fallback default
get_tech_stack() {
    local cache_file="$CACHE_DIR/tech_stack"
    local mission_lite=".yoyo-dev/product/mission-lite.md"
    local tech_stack_file=".yoyo-dev/product/tech-stack.md"
    local tech_stack=""
    local source_file=""

    # Determine which source file to check for cache validation
    if [ -f "$mission_lite" ]; then
        source_file="$mission_lite"
    elif [ -f "$tech_stack_file" ]; then
        source_file="$tech_stack_file"
    fi

    # Check cache first
    if _is_cache_valid "$cache_file" "$source_file"; then
        tech_stack=$(_read_cache "$cache_file")
        if [ -n "$tech_stack" ]; then
            printf "%s" "$tech_stack"
            return 0
        fi
    fi

    # Try extracting from mission-lite.md first
    if [ -f "$mission_lite" ]; then
        if grep -q "## Tech Stack" "$mission_lite" 2>/dev/null; then
            tech_stack=$(sed -n '/^## Tech Stack/,/^##/p' "$mission_lite" 2>/dev/null | \
                        grep -v "^##" | \
                        sed 's/- //g' | \
                        tr '\n' ' ' | \
                        sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)
        fi
    fi

    # Fallback to tech-stack.md if nothing found
    if [ -z "$tech_stack" ] && [ -f "$tech_stack_file" ]; then
        local frontend=""
        local backend=""

        # Try extracting Frontend and Backend labels
        frontend=$(grep -iE "^-?\s*\*?\*?Frontend\*?\*?:" "$tech_stack_file" 2>/dev/null | \
                  head -n 1 | \
                  sed 's/.*://;s/\*//g;s/^[[:space:]]*//;s/[[:space:]]*$//' || true)
        backend=$(grep -iE "^-?\s*\*?\*?Backend\*?\*?:" "$tech_stack_file" 2>/dev/null | \
                 head -n 1 | \
                 sed 's/.*://;s/\*//g;s/^[[:space:]]*//;s/[[:space:]]*$//' || true)

        # If explicit labels not found, try pattern matching
        if [ -z "$frontend" ] && [ -z "$backend" ]; then
            frontend=$(grep -iE "(React|Next\.js|Vue|Angular|Svelte)" "$tech_stack_file" 2>/dev/null | \
                      head -n 1 | \
                      sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | \
                      cut -d',' -f1 || true)
            backend=$(grep -iE "(Node|Express|Django|Flask|FastAPI|Convex|Supabase|Firebase)" "$tech_stack_file" 2>/dev/null | \
                     head -n 1 | \
                     sed 's/^-\s*//;s/^[[:space:]]*//;s/[[:space:]]*$//' | \
                     cut -d',' -f1 || true)
        fi

        # Combine frontend and backend
        if [ -n "$frontend" ] && [ -n "$backend" ]; then
            tech_stack="$frontend + $backend"
        elif [ -n "$frontend" ]; then
            tech_stack="$frontend"
        elif [ -n "$backend" ]; then
            tech_stack="$backend"
        fi
    fi

    # Fallback to default if still empty
    if [ -z "$tech_stack" ]; then
        tech_stack="Not configured yet - run /plan-product or /analyze-product"
    fi

    # Cache the result
    _write_cache "$cache_file" "$tech_stack"

    printf "%s" "$tech_stack"
}

# Clear cache (useful for testing or manual refresh)
clear_project_context_cache() {
    if [ -d "$CACHE_DIR" ]; then
        rm -rf "$CACHE_DIR"
        _ensure_cache_dir
    fi
}
