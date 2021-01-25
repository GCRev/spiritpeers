PAC_BU=0
if [[ -f package.json ]]; then
  mv package.json package.json.bu
  PAC_BU=1
fi

DEPS="env-paths markdown-it uuid ws ./client/"
npm install --no-package-lock --no-save $DEPS

if [[ $PAC_BU -eq 1 ]]; then
  mv package.json.bu package.json
  rm package.json.bu
fi
