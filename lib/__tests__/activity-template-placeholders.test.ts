import {
  substituteActivityTemplatePlaceholders,
  type ActivityTemplatePlaceholderContext,
} from "@/lib/activity-template-placeholders";

const fullCtx: ActivityTemplatePlaceholderContext = {
  contact: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
  },
  property: {
    address1: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

describe("substituteActivityTemplatePlaceholders", () => {
  it("substitutes contact and property placeholders", () => {
    expect(
      substituteActivityTemplatePlaceholders(
        "Hi {{contact.firstName}} — {{property.address1}}",
        fullCtx
      )
    ).toBe("Hi Jane — 123 Main St");
  });

  it("uses fullName and fullAddress", () => {
    expect(
      substituteActivityTemplatePlaceholders(
        "{{contact.fullName}} / {{property.fullAddress}}",
        fullCtx
      )
    ).toBe("Jane Doe / 123 Main St, Austin, TX 78701");
  });

  it("resolves known placeholders to empty when contact is missing", () => {
    expect(
      substituteActivityTemplatePlaceholders("{{contact.firstName}}", {
        property: fullCtx.property,
      })
    ).toBe("");
  });

  it("resolves known placeholders to empty when property is missing", () => {
    expect(
      substituteActivityTemplatePlaceholders("{{property.city}}", {
        contact: fullCtx.contact,
      })
    ).toBe("");
  });

  it("leaves unknown placeholders unchanged", () => {
    expect(
      substituteActivityTemplatePlaceholders(
        "{{contact.firstName}} {{not.a.token}} {{property.zip}}",
        fullCtx
      )
    ).toBe("Jane {{not.a.token}} 78701");
  });

  it("handles multiple occurrences and mixed known/unknown", () => {
    expect(
      substituteActivityTemplatePlaceholders(
        "{{contact.email}} | {{contact.email}} | {{foo}}",
        fullCtx
      )
    ).toBe("jane@example.com | jane@example.com | {{foo}}");
  });

  it("returns empty string for empty input", () => {
    expect(substituteActivityTemplatePlaceholders("", fullCtx)).toBe("");
  });

  it("treats optional email as empty when null", () => {
    expect(
      substituteActivityTemplatePlaceholders("{{contact.email}}", {
        contact: { firstName: "A", lastName: "B", email: null },
      })
    ).toBe("");
  });
});
