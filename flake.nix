{
  description = "ClaudeOS v3 Railway Template";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            nodePackages.npm
            git curl jq ripgrep fd tree
            openssh openssl
            python3
            python3Packages.pip
            python3Packages.fastapi
            python3Packages.uvicorn
          ];
        };
      }
    );
}
