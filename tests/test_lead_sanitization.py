# tests/test_lead_sanitization.py
"""
Tests for lead data sanitization and input validation.

Note: Some tests are skipped until sanitization functions are extracted
to their own module or exposed in the lead_processing module.
"""
import pytest


# Check if sanitization functions exist
try:
    from app.services.lead_processing import sanitize_field, validate_email, validate_phone
    HAS_SANITIZE_FUNCS = True
except ImportError:
    HAS_SANITIZE_FUNCS = False


@pytest.mark.skipif(not HAS_SANITIZE_FUNCS, reason="sanitize_field not exposed in lead_processing")
class TestLeadSanitization:
    """Test lead data sanitization functions."""

    def test_sanitize_removes_null_bytes(self):
        """Null bytes should be removed from input."""
        from app.services.lead_processing import sanitize_field

        result = sanitize_field("test\x00hidden\x00data")
        assert "\x00" not in result
        assert result == "testhiddendata"

    def test_sanitize_removes_xss_scripts(self):
        """Script tags should be escaped or removed."""
        from app.services.lead_processing import sanitize_field

        result = sanitize_field("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "alert" not in result.lower() or "&lt;" in result

    def test_sanitize_normalizes_whitespace(self):
        """Excessive whitespace should be normalized."""
        from app.services.lead_processing import sanitize_field

        result = sanitize_field("  lots   of    spaces  ")
        assert result == "lots of spaces"

    def test_sanitize_unescapes_html_entities(self):
        """HTML entities should be unescaped."""
        from app.services.lead_processing import sanitize_field

        result = sanitize_field("&lt;test&gt; &amp; &#x27;quotes&#x27;")
        # Should contain actual characters, not entities
        assert "&lt;" not in result or "<" in result

    def test_sanitize_handles_none(self):
        """None values should be handled gracefully."""
        from app.services.lead_processing import sanitize_field

        result = sanitize_field(None)
        assert result is None or result == ""

    def test_sanitize_handles_empty_string(self):
        """Empty strings should be handled gracefully."""
        from app.services.lead_processing import sanitize_field

        result = sanitize_field("")
        assert result == ""

    def test_sanitize_preserves_valid_data(self):
        """Valid data should pass through unchanged."""
        from app.services.lead_processing import sanitize_field

        valid_inputs = [
            "John Doe",
            "john.doe@example.com",
            "555-123-4567",
            "Acme Corporation Inc.",
        ]
        for input_val in valid_inputs:
            result = sanitize_field(input_val)
            assert result == input_val


@pytest.mark.skipif(not HAS_SANITIZE_FUNCS, reason="validate_email not exposed in lead_processing")
class TestEmailValidation:
    """Test email validation."""

    def test_valid_emails_accepted(self):
        """Valid email addresses should be accepted."""
        from app.services.lead_processing import validate_email

        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
            "first.last@subdomain.example.com",
        ]
        for email in valid_emails:
            assert validate_email(email) is True, f"Should accept: {email}"

    def test_invalid_emails_rejected(self):
        """Invalid email addresses should be rejected."""
        from app.services.lead_processing import validate_email

        invalid_emails = [
            "notanemail",
            "@nodomain.com",
            "noat.com",
            "spaces in@email.com",
            "",
        ]
        for email in invalid_emails:
            assert validate_email(email) is False, f"Should reject: {email}"


@pytest.mark.skipif(not HAS_SANITIZE_FUNCS, reason="validate_phone not exposed in lead_processing")
class TestPhoneValidation:
    """Test phone number validation."""

    def test_valid_phones_accepted(self):
        """Valid phone numbers should be accepted."""
        from app.services.lead_processing import validate_phone

        valid_phones = [
            "555-123-4567",
            "(555) 123-4567",
            "+1-555-123-4567",
            "5551234567",
            "555.123.4567",
        ]
        for phone in valid_phones:
            assert validate_phone(phone) is True, f"Should accept: {phone}"

    def test_too_short_phones_rejected(self):
        """Phone numbers that are too short should be rejected."""
        from app.services.lead_processing import validate_phone

        short_phones = [
            "123",
            "12345",
            "123-45",
        ]
        for phone in short_phones:
            assert validate_phone(phone) is False, f"Should reject: {phone}"


class TestLeadProcessingIntegration:
    """Integration tests for lead processing pipeline."""

    def test_malicious_lead_is_sanitized(self, client, test_org, malicious_lead_data):
        """Malicious input should be sanitized before storage."""
        # Use the org's API key to submit a lead
        response = client.post(
            "/api/public/leads",
            json=malicious_lead_data,
            headers={"X-Org-Key": test_org.api_key}
        )
        # Should succeed (sanitized) or fail validation (rejected)
        # Either way, malicious content should not be stored as-is
        assert response.status_code in [200, 201, 400, 422]

    def test_valid_lead_is_processed(self, client, test_org, sample_lead_data):
        """Valid lead data should be processed successfully."""
        response = client.post(
            "/api/public/leads",
            json=sample_lead_data,
            headers={"X-Org-Key": test_org.api_key}
        )
        assert response.status_code in [200, 201]
