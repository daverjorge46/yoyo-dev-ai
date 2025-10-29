"""
Tests for widget refresh() method signature compatibility.

Bug Description:
Textual's Widget base class has a refresh() method with a specific signature.
Custom widgets that override refresh() must maintain signature compatibility
to avoid TypeErrors and runtime errors.

The Textual Widget.refresh() signature (as of Textual 0.40+) is:
    def refresh(self, *, repaint: bool = True, layout: bool = False) -> Self

If a widget overrides refresh() without accepting these keyword arguments,
it will cause a TypeError when Textual tries to call refresh() internally.

Expected Behavior:
All widget refresh methods should:
1. Accept **kwargs for future compatibility
2. Call super().refresh() to maintain proper behavior
3. Not break when Textual calls refresh(repaint=True) internally

Test Strategy:
1. Test that widgets can be instantiated
2. Test that calling refresh() directly works
3. Test that calling refresh(repaint=True, layout=False) works (Textual's usage)
4. Verify method signatures are compatible

Widgets to test:
- GitStatus (has refresh() override)
- ProjectOverview (has load_context() and reload_context())
- SpecList (has refresh_data())
"""

import unittest
from pathlib import Path
import sys
import inspect

# Add lib to path for imports
sys.path.insert(0, str(Path.home() / '.yoyo-dev' / 'lib'))


class TestWidgetRefreshMethodSignatures(unittest.TestCase):
    """Test that widget refresh methods have compatible signatures."""

    def test_git_status_refresh_signature_compatible(self):
        """Test that GitStatus.refresh() accepts keyword arguments."""
        from yoyo_tui.widgets.git_status import GitStatus

        # Create widget
        widget = GitStatus()

        # Get refresh method signature
        sig = inspect.signature(widget.refresh)

        # Check if method accepts **kwargs or specific keyword arguments
        params = sig.parameters

        # Should have **kwargs for compatibility
        has_var_keyword = any(
            param.kind == inspect.Parameter.VAR_KEYWORD
            for param in params.values()
        )

        self.assertTrue(
            has_var_keyword,
            "GitStatus.refresh() should accept **kwargs for compatibility"
        )

    def test_git_status_refresh_call_without_args(self):
        """Test that GitStatus.refresh() can be called without arguments."""
        from yoyo_tui.widgets.git_status import GitStatus

        widget = GitStatus()

        # Should not raise TypeError
        try:
            widget.refresh()
        except TypeError as e:
            self.fail(f"refresh() should be callable without args: {e}")

    def test_git_status_refresh_call_with_kwargs(self):
        """Test that GitStatus.refresh() can be called with keyword arguments."""
        from yoyo_tui.widgets.git_status import GitStatus

        widget = GitStatus()

        # Should not raise TypeError when called with kwargs
        # (this is how Textual calls refresh internally)
        try:
            widget.refresh(repaint=True)
        except TypeError as e:
            self.fail(f"refresh() should accept keyword arguments: {e}")

        try:
            widget.refresh(repaint=True, layout=False)
        except TypeError as e:
            self.fail(f"refresh() should accept multiple keyword arguments: {e}")

    def test_project_overview_has_no_refresh_override(self):
        """Test that ProjectOverview doesn't override refresh() incorrectly."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        # Create widget
        widget = ProjectOverview()

        # Check if refresh() is overridden
        has_refresh = hasattr(ProjectOverview, 'refresh')

        if has_refresh:
            # If overridden, check signature compatibility
            sig = inspect.signature(widget.refresh)
            params = sig.parameters

            # Should have **kwargs if overridden
            has_var_keyword = any(
                param.kind == inspect.Parameter.VAR_KEYWORD
                for param in params.values()
            )

            self.assertTrue(
                has_var_keyword or len(params) == 0,
                "ProjectOverview.refresh() should accept **kwargs if overridden"
            )

    def test_project_overview_refresh_call_safe(self):
        """Test that calling refresh() on ProjectOverview is safe."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview()

        # Should not raise TypeError
        try:
            widget.refresh()
        except TypeError as e:
            self.fail(f"refresh() call should not raise TypeError: {e}")

        # Should also work with kwargs (Textual's usage)
        try:
            widget.refresh(repaint=True, layout=False)
        except TypeError as e:
            self.fail(f"refresh(repaint=True, layout=False) should work: {e}")

    def test_spec_list_has_no_refresh_override(self):
        """Test that SpecList doesn't override refresh() incorrectly."""
        from yoyo_tui.widgets.spec_list import SpecList

        # Create widget
        widget = SpecList()

        # Check if refresh() is overridden
        has_refresh = hasattr(SpecList, 'refresh')

        if has_refresh:
            # If overridden, check signature compatibility
            sig = inspect.signature(widget.refresh)
            params = sig.parameters

            # Should have **kwargs if overridden
            has_var_keyword = any(
                param.kind == inspect.Parameter.VAR_KEYWORD
                for param in params.values()
            )

            self.assertTrue(
                has_var_keyword or len(params) == 0,
                "SpecList.refresh() should accept **kwargs if overridden"
            )

    def test_spec_list_refresh_call_safe(self):
        """Test that calling refresh() on SpecList is safe."""
        from yoyo_tui.widgets.spec_list import SpecList

        widget = SpecList()

        # Should not raise TypeError
        try:
            widget.refresh()
        except TypeError as e:
            self.fail(f"refresh() call should not raise TypeError: {e}")

        # Should also work with kwargs (Textual's usage)
        try:
            widget.refresh(repaint=True, layout=False)
        except TypeError as e:
            self.fail(f"refresh(repaint=True, layout=False) should work: {e}")


class TestWidgetAlternativeRefreshMethods(unittest.TestCase):
    """Test alternative refresh methods that widgets provide."""

    def test_project_overview_has_load_context(self):
        """Test that ProjectOverview has load_context() method."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview()

        self.assertTrue(
            hasattr(widget, 'load_context'),
            "ProjectOverview should have load_context() method"
        )
        self.assertTrue(
            callable(widget.load_context),
            "load_context should be callable"
        )

    def test_project_overview_has_reload_context(self):
        """Test that ProjectOverview has reload_context() method."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview()

        self.assertTrue(
            hasattr(widget, 'reload_context'),
            "ProjectOverview should have reload_context() method"
        )
        self.assertTrue(
            callable(widget.reload_context),
            "reload_context should be callable"
        )

    def test_project_overview_load_context_signature(self):
        """Test that load_context() has simple signature (no required args)."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview()

        # Get signature
        sig = inspect.signature(widget.load_context)

        # Should not require any arguments
        required_params = [
            name for name, param in sig.parameters.items()
            if param.default == inspect.Parameter.empty
            and param.kind not in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD)
        ]

        self.assertEqual(
            len(required_params), 0,
            "load_context() should not require any arguments"
        )

    def test_project_overview_reload_context_signature(self):
        """Test that reload_context() has simple signature (no required args)."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        widget = ProjectOverview()

        # Get signature
        sig = inspect.signature(widget.reload_context)

        # Should not require any arguments
        required_params = [
            name for name, param in sig.parameters.items()
            if param.default == inspect.Parameter.empty
            and param.kind not in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD)
        ]

        self.assertEqual(
            len(required_params), 0,
            "reload_context() should not require any arguments"
        )

    def test_spec_list_has_refresh_data(self):
        """Test that SpecList has refresh_data() method."""
        from yoyo_tui.widgets.spec_list import SpecList

        widget = SpecList()

        self.assertTrue(
            hasattr(widget, 'refresh_data'),
            "SpecList should have refresh_data() method"
        )
        self.assertTrue(
            callable(widget.refresh_data),
            "refresh_data should be callable"
        )

    def test_spec_list_has_load_specs(self):
        """Test that SpecList has load_specs() method."""
        from yoyo_tui.widgets.spec_list import SpecList

        widget = SpecList()

        self.assertTrue(
            hasattr(widget, 'load_specs'),
            "SpecList should have load_specs() method"
        )
        self.assertTrue(
            callable(widget.load_specs),
            "load_specs should be callable"
        )

    def test_git_status_has_update_status(self):
        """Test that GitStatus has update_status() method."""
        from yoyo_tui.widgets.git_status import GitStatus

        widget = GitStatus()

        self.assertTrue(
            hasattr(widget, 'update_status'),
            "GitStatus should have update_status() method"
        )
        self.assertTrue(
            callable(widget.update_status),
            "update_status should be callable"
        )


class TestWidgetRefreshMethodDocumentation(unittest.TestCase):
    """Test that refresh methods are properly documented."""

    def test_git_status_refresh_has_docstring(self):
        """Test that GitStatus.refresh() has docstring."""
        from yoyo_tui.widgets.git_status import GitStatus

        self.assertIsNotNone(
            GitStatus.refresh.__doc__,
            "refresh() should have docstring explaining its purpose"
        )

    def test_project_overview_load_context_has_docstring(self):
        """Test that ProjectOverview.load_context() has docstring."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        self.assertIsNotNone(
            ProjectOverview.load_context.__doc__,
            "load_context() should have docstring"
        )

    def test_project_overview_reload_context_has_docstring(self):
        """Test that ProjectOverview.reload_context() has docstring."""
        from yoyo_tui.widgets.project_overview import ProjectOverview

        self.assertIsNotNone(
            ProjectOverview.reload_context.__doc__,
            "reload_context() should have docstring"
        )

    def test_spec_list_refresh_data_has_docstring(self):
        """Test that SpecList.refresh_data() has docstring."""
        from yoyo_tui.widgets.spec_list import SpecList

        self.assertIsNotNone(
            SpecList.refresh_data.__doc__,
            "refresh_data() should have docstring"
        )


if __name__ == '__main__':
    unittest.main()
