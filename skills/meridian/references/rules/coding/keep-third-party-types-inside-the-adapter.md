## Keep third-party types inside the adapter

**Law:** Use a library behind the owning module's port when the application needs its own terms or must not depend on the library directly, and keep the library's types and exceptions inside the adapter that implements the port.

**When:** Calling a third-party library or SDK from application code. A port is the application-owned type that names a capability; an adapter is its implementation.

Bad: A use case that catches `StripeException` and returns a `Stripe.Charge`.
Good: The adapter catches `StripeException` and returns the application's own `PaymentResult`.
