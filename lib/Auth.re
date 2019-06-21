open Graphql_lwt;

let token = "asd";
let authErrors = [];

type tokenPayloadDTO = {token: string};
type authError = [ | `INVALID_EMAIL];

type loginResponse = {
  result: option(tokenPayloadDTO),
  errors: list(authError),
};

let tokenValue = token;

let authError =
  Schema.(
    enum(
      "error",
      ~values=[
        enum_value(
          "INVALID_EMAIL",
          ~value=`INVALID_EMAIL,
          ~doc="Invalid email error",
        ),
      ],
    )
  );

let authErrors =
  Schema.(
    io_field(
      "errors",
      ~typ=non_null(list(authError)),
      ~args=Arg.[],
      ~resolve=(ctx, a) =>
      Lwt_result.return(a)
    )
  );

let token =
  Schema.(
    io_field("token", ~typ=non_null(string), ~args=Arg.[], ~resolve=(ctx, s) =>
      Lwt_result.return(s.token)
    )
  );

let result = Schema.(obj("result", ~fields=_ => [token]));

let resultField =
  Schema.(
    io_field(
      "result", ~typ=non_null(result), ~args=Arg.[], ~resolve=(ctx, r) =>
      Lwt_result.return({token: r.token})
    )
  );

let loginResponse: Graphql_lwt.Schema.typ(unit, option(tokenPayloadDTO)) =
  Schema.(
    obj("Result", ~doc="Login auth result", ~fields=_ =>
      [
        io_field(
          "result", ~typ=non_null(result), ~args=Arg.[], ~resolve=(ctx, s) =>
          Lwt_result.return(s)
        ),
        io_field(
          "errors",
          ~typ=non_null(list(authError)),
          ~args=Arg.[],
          ~resolve=(ctx, s) =>
          Lwt_result.return([])
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
      ~resolve=(ctx, result, email, password) =>
      Lwt_result.return({result: Some({token: tokenValue}), errors: []})
    )
  );