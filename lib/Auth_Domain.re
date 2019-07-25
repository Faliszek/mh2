let authenticateUser = (~email, ~password) => {
  Db.User.getByEmail(
    email,
    // Db.User.get |> List.map((u: Db.User.t) => print_endline(u.id)) |> ignore;
  );
};

let createToken = (~email, ~password) => {
  let hashedPassword = Bcrypt.hash(password);

  print_endline(hashedPassword |> Bcrypt.string_of_hash);
};