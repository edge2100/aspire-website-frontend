const normalizeLeadPayload = (payload = {}) => ({
  full_name: String(payload.full_name || "").trim(),
  phone_number: String(payload.phone_number || "").trim(),
  organization_name: String(payload.organization_name || "").trim(),
  email: String(payload.email || "").trim(),
  no_of_emp: String(payload.no_of_emp || "").trim(),
});

const validateLeadPayload = (lead) => {
  const errors = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!lead.full_name) errors.push("Full name is required.");
  if (!lead.organization_name) errors.push("Organization name is required.");
  if (!lead.email || !emailPattern.test(lead.email)) {
    errors.push("A valid email is required.");
  }
  if (!lead.no_of_emp || Number.isNaN(Number(lead.no_of_emp))) {
    errors.push("No. of employees must be numeric.");
  }

  return errors;
};

module.exports = { normalizeLeadPayload, validateLeadPayload };
