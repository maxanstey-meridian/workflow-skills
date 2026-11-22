## Keep third-party types inside the adapter

**Law:** Put a third-party library behind the owning module's port when the application needs its own terms or isolation, keeping library types and exceptions inside the adapter.

**When:** Calling a third-party library or SDK from application code.

Bad: A use case catching `StripeException` and returning a `Stripe.Charge`.
Good: The adapter catching `StripeException` and returning the application's `PaymentResult`.
