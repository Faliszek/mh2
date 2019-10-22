open Graphql_lwt;
open Tablecloth;
open Auth_Domain;

type authError =
  | WrongCredentials;

type tokenPayloadDTO = {token: string};

type loginResponse = {

  result: option(tokenPayloadDTO),
  errors: option(list(authError)),
};



let authError: Graphql_lwt.Schema.typ(unit, option(authError)) =
  Schema.(
    enum(
      "AuthenticateResponseError",
      ~values=[
        enum_value(
          "INVALID_CREDENTIALS",
          ~value=WrongCredentials,
          ~doc="Invalid email error",
        ),
      ],
    )
  );

let result =
  Schema.(
    obj("LoginResult", ~fields=_ =>
      [
        Schema.(
          io_field(
            "token", ~typ=non_null(string), ~args=Arg.[], ~resolve=(ctx, s) =>
            Lwt_result.return(s.token)
          )
        ),
      ]
    )
  );

let resultField =
  Schema.(
    io_field("result", ~typ=result, ~args=Arg.[], ~resolve=(ctx, r) =>
      Lwt_result.return(Some({token: r.token}))
    )
  );

let loginResponse: Graphql_lwt.Schema.typ(unit, option(loginResponse)) =
  Schema.(
    obj("LoginResponse", ~doc="Login auth result", ~fields=_ =>
      [
        io_field("result", ~typ=result, ~args=Arg.[], ~resolve=(ctx, s) =>
          Lwt_result.return(s.result)
        ),
        io_field(
          "errors",
          ~typ=list(non_null(authError)),
          ~args=Arg.[],
          ~resolve=(ctx, s) => {
          s.errors |> Lwt_result.return
        }),
      ]
    )
  );

let loginMutation: Graphql_lwt.Schema.field(unit, unit) =
  { open Schema;
    io_field(
      "login",
      ~typ=non_null(loginResponse),
      ~args=
        Arg.[
          arg("email", ~typ=non_null(string)),
          arg("password", ~typ=non_null(string)),
        ],
      ~resolve=(ctx, _, email, password) => {
        let loginResponse =
          authenticateUser(~email, ~password)
          |> Lwt.map(token =>
               switch (token) {
               | Some(token) => {errors: None, result: Some({token: token})}
               | None => {errors: Some([WrongCredentials]), result: None}
               }
             );

        Lwt_result.ok(loginResponse);
      },
    )
  ; };