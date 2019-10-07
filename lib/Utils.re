/* NOTE: not used for now */

module List = {
  let collect: list(option('t)) => list('t) =
    arr =>
      arr
      |> List.fold_left(
           (acc, x) =>
             switch (x) {
             | Some(x) => acc
             | None => acc
             },
           [],
         );
};