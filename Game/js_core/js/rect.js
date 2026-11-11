export class Rect {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    get centerx() { return this.x + this.w / 2; }
    get centery() { return this.y + this.h / 2; }

    move(dx, dy) {
        return new Rect(this.x + dx, this.y + dy, this.w, this.h);
    }

    colliderect(other) {
        return this.x < other.x + other.w &&
            this.x + this.w > other.x &&
            this.y < other.y + other.h &&
            this.y + this.h > other.y;
    }

    collidepoint(px, py) {
        return px >= this.x && px < this.x + this.w &&
            py >= this.y && py < this.y + this.h;
    }
}