# screenshot-diff
Acquire difference by environment with screenshot.


## Installation

Clone this repository and install npm package.

```
  npm install
```

Set BASE_URL and COMPARE_URL environments with .env

```
  export BASE_URL=https://example.com
  export COMPARE_URL=https://example-compare.com
```

## Usage

### SimpleCase

```
  node screenshot-diff --path=index.html
  # -> Output result on tmp/index_pc.html
```

### Screenshot with smartphone

```
  node screenshot-diff --path=index.html  --device=sp
  # -> Output result on tmp/index_sp.html
```

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/miraoto/screenshot-diff. This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.

## License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

## Code of Conduct

Everyone interacting in the AmazonPa project’s codebases, issue trackers, chat rooms and mailing lists is expected to follow the [code of conduct](https://github.com/miraoto/screenshot-diff/blob/master/CODE_OF_CONDUCT.md).
