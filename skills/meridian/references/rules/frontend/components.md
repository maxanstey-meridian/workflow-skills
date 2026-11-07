## Components

Leaf components are presentational. Feature-container components may consume
an already-provided context when that keeps orchestration out of leaves; name
and place them so their role is obvious.

They may:

- render data
- hold local UI interaction
- emit events
- consume already-provided capabilities
- import pure `logic/` helpers directly

They should not:

- call generated clients directly
- own workflow orchestration
- construct infrastructure dependencies
- reach around the page composition root
