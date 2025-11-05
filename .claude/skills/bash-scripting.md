# Bash Scripting Expert

Expert in writing robust, maintainable bash scripts with proper error handling, validation, and best practices.

## When to use this skill

Use this skill when:
- Writing new bash scripts for setup, automation, or utilities
- Debugging bash script errors or unexpected behavior
- Adding error handling and validation to existing scripts
- Optimizing bash script performance
- Need help with bash syntax, conditionals, or loops
- Working with shell variables, functions, or arrays
- Implementing file operations, text processing, or command chaining

## What I'll help with

- **Script Structure**: Proper shebang, set options (set -e, set -u), and organization
- **Error Handling**: Exit codes, error messages, trap commands
- **Input Validation**: Argument parsing, flag handling, input sanitization
- **Functions**: Reusable bash functions with proper scoping
- **Text Processing**: grep, sed, awk, cut, and string manipulation
- **File Operations**: Safe file reading/writing, temp files, permissions
- **Best Practices**: Quoting, parameter expansion, command substitution
- **Testing**: How to test bash scripts, common pitfalls to avoid

## Key Expertise

- POSIX compliance vs bash-specific features
- Safe variable handling and quoting
- Process management and background jobs
- Exit codes and error propagation
- Shell option flags (pipefail, nounset, errexit)
- Color output and user-friendly formatting
- Cross-platform compatibility (Linux/macOS)

## Examples

**Error handling:**
```bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found" >&2
    exit 1
fi
```

**Safe variable usage:**
```bash
# Always quote variables
if [ -f "$file_path" ]; then
    echo "File exists: $file_path"
fi

# Use ${var:-default} for defaults
TIMEOUT="${TIMEOUT:-300}"
```

**Function with validation:**
```bash
validate_venv_shebang() {
    local venv_path="$1"

    [ -f "$venv_path/bin/pip" ] || return 1

    local shebang=$(head -1 "$venv_path/bin/pip")
    local python_path="${shebang#\#!}"

    [ -f "$python_path" ] && return 0 || return 1
}
```
