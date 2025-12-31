# Testing Strategy Expert

Write tests using TDD, pytest, and bash testing patterns with mocking, fixtures, and coverage analysis.

**Keywords:** test, tdd, pytest, unit test, integration test, mock, fixture, coverage, flaky test, failing test, test strategy, regression

## When to use this skill

Use this skill when:
- Implementing Test-Driven Development (TDD) workflow
- Writing unit tests for bash scripts or Python code
- Creating integration tests for multi-component features
- Designing regression test suites
- Need help with test organization and structure
- Debugging failing tests or flaky tests
- Measuring and improving test coverage
- Mocking external dependencies or system calls

## What I'll help with

- **TDD Workflow**: Red-Green-Refactor cycle, test-first development
- **Bash Testing**: Testing bash functions, script behavior, exit codes
- **Python Testing**: pytest, unittest, fixtures, parametrization
- **Integration Tests**: Testing component interaction, end-to-end flows
- **Regression Tests**: Preventing bug reintroduction, behavior validation
- **Test Organization**: Directory structure, naming conventions, discovery
- **Mocking**: Isolating tests, mocking files/commands/APIs
- **Coverage**: Measuring coverage, identifying gaps

## Key Expertise

- Test pyramid (unit, integration, e2e)
- TDD best practices and patterns
- Bash script testing techniques
- pytest features (fixtures, parametrize, marks)
- Test isolation and independence
- Edge case identification
- Performance testing for scripts
- CI/CD integration

## Testing Patterns

**TDD Cycle:**
1. **Red**: Write failing test
2. **Green**: Make test pass with minimal code
3. **Refactor**: Clean up while tests pass
4. **Repeat**: Continue for next feature

**Test Categories:**
- **Unit Tests**: Single function/component
- **Integration Tests**: Multiple components working together
- **Regression Tests**: Verify bugs stay fixed
- **Edge Case Tests**: Boundary conditions, error states

## Examples

**Bash test script:**
```bash
#!/bin/bash
# Test validate_venv_shebang function

test_valid_shebang() {
    local test_venv="/tmp/test_venv_$$"
    python3 -m venv "$test_venv"

    if validate_venv_shebang "$test_venv"; then
        echo "✓ PASS: Valid shebang detected"
        rm -rf "$test_venv"
        return 0
    else
        echo "✗ FAIL: Valid shebang not detected"
        rm -rf "$test_venv"
        return 1
    fi
}

test_broken_shebang() {
    local test_venv="/tmp/test_venv_$$"
    python3 -m venv "$test_venv"

    # Break the shebang
    echo "#!/path/that/does/not/exist" > "$test_venv/bin/pip.tmp"
    tail -n +2 "$test_venv/bin/pip" >> "$test_venv/bin/pip.tmp"
    mv "$test_venv/bin/pip.tmp" "$test_venv/bin/pip"

    if ! validate_venv_shebang "$test_venv"; then
        echo "✓ PASS: Broken shebang detected"
        rm -rf "$test_venv"
        return 0
    else
        echo "✗ FAIL: Broken shebang not detected"
        rm -rf "$test_venv"
        return 1
    fi
}
```

**Python pytest:**
```python
import pytest
from pathlib import Path

def test_parse_spec_file():
    """Test spec file parsing."""
    spec_path = Path("test_spec.md")
    parser = SpecParser()

    result = parser.parse(spec_path)

    assert result.title == "Test Spec"
    assert len(result.tasks) == 5
    assert result.status == "pending"

@pytest.mark.parametrize("status,expected", [
    ("pending", False),
    ("in_progress", False),
    ("completed", True),
])
def test_is_complete(status, expected):
    """Test completion check."""
    spec = Spec(status=status)
    assert spec.is_complete() == expected
```
