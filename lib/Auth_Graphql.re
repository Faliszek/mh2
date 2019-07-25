open Graphql_lwt;
open Auth_Domain;

let token = "asd";
let authErrors = [];

type tokenPayloadDTO = {token: string};
type authError =
  | InvalidEmail
  | WrongCredentials;

type loginResponse = {result: option(tokenPayloadDTO)};

let tokenValue = token;

let authError: Graphql_lwt.Schema.typ(unit, option(authError)) =
  Schema.(
    enum(
      "AuthenticateResponseError",
      ~values=[
        enum_value(
          "INVALID_EMAIL",
          ~value=InvalidEmail,
          ~doc="Invalid email error",
        ),
        enum_value(
          "INVALID_CREDENTIALS",
          ~value=WrongCredentials,
          ~doc="Invalid email error",
        ),
      ],
    )
  );

let token =
  Schema.(
    io_field("token", ~typ=non_null(string), ~args=Arg.[], ~resolve=(ctx, s) =>
      Lwt_result.return(s.token)
    )
  );

let result = Schema.(obj("LoginResult", ~fields=_ => [token]));

let resultField =
  Schema.(
    io_field(
      "result", ~typ=non_null(result), ~args=Arg.[], ~resolve=(ctx, r) =>
      Lwt_result.return({token: r.token})
    )
  );

let loginResponse: Graphql_lwt.Schema.typ(unit, option(tokenPayloadDTO)) =
  Schema.(
    obj("LoginResponse", ~doc="Login auth result", ~fields=_ =>
      [
        io_field(
          "result", ~typ=non_null(result), ~args=Arg.[], ~resolve=(ctx, s) =>
          Lwt_result.return(s)
        ),
        io_field(
          "errors", ~typ=list(authError), ~args=Arg.[], ~resolve=(ctx, s) =>
          Lwt_result.return(None)
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
      ~resolve=(ctx, _, email, password) => {
        authenticateUser(~email, ~password);

        Lwt_result.return(
          {
            {token: tokenValue};
          },
        );
      },
    )
  );