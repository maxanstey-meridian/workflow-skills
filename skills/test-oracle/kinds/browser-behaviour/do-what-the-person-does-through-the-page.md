## Do what the person does, through the page

**Law:** Do what the person does, through the page.

**When:** Writing every test of a case of this kind.

Bad: A test that posts to the suspend endpoint and asserts the response body, with the page never opened.
Good: The test signs the admin in, opens the record's page, presses Suspend in the page's own control, and asserts the status the page now shows.
