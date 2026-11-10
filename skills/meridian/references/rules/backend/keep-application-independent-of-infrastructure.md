## Keep Application independent of Infrastructure

**Law:** Application may depend on Domain and never on Infrastructure; Application owns its ports and Infrastructure implements them.

**When:** A module that has the three layers (Domain, Application, Infrastructure), on .NET or TypeScript. A port is the Application-owned type that names a capability.

Bad: a use case that takes `EfFormRepository`.
Good: a use case that takes `FormRepository`, declared in `Application/Ports`.
