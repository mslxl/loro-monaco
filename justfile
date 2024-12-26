build:
    pnpm build

demo: build
    cd demo && pnpm install
    cd demo && pnpm dev

publish: build
    pnpm publish

