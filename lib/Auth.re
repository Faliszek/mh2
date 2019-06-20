open Graphql_lwt;

let token = "asd";

type tokenPayloadDTO = {token: string};

let tokenValue = token;

let loginResponse: Graphql_lwt.Schema.typ(unit, option(tokenPayloadDTO)) =
  Schema.(
    obj("Result", ~doc="Login auth result", ~fields=_ =>
      [
        // fields
        io_field(
          "token", ~typ=non_null(string), ~args=Arg.[], ~resolve=(ctx, s) =>
          Lwt_result.return(s.token)
        ),
      ]
    )
  );

let loginMutation: Graphql_lwt.Schema.field(unit, unit) =
  Schema.(
    io_field(
      "login",
      ~typ=non_null(loginResponse),
      ~args=
        Arg.[
          arg("email", ~typ=non_null(string)),
          arg("password", ~typ=non_null(string)),
        ],
      ~resolve=(ctx, _, email, password) =>
      Lwt_result.return({token: tokenValue})
    )
  );