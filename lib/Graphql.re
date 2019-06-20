open Graphql_lwt;

let token = "asd";

type tokenPayloadDTO = {token: string};

let tokenValue = token;

let loginPayload =
  Schema.(
    obj("Result", ~doc="Login auth result", ~fields=fields =>
      [
        io_field(
          "token", ~typ=non_null(string), ~args=Arg.[], ~resolve=(info, s) =>
          Lwt_result.return(s.token)
        ),
        //   Lwt_result.return(fields)
      ]
    )
  );

let schema =
  Schema.(
    schema(
      [],
      ~mutations=[
        io_field(
          "login",
          ~typ=non_null(loginPayload),
          ~args=
            Arg.[
              arg("email", ~typ=non_null(string)),
              arg("password", ~typ=non_null(string)),
            ],
          ~resolve=(_, _, email, password) => {
            print_endline(email);
            print_endline(password);
            Lwt_result.return({token: tokenValue});
          },
        ),
      ],
    )
  );