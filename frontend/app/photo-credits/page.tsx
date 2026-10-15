import Link from "next/link";

export default function PhotoCredits() {
  const photos = [
    ["ห้องประชุม", "Mikhail Nilov", "table-and-chairs-inside-the-conference-room-8102299"],
    ["ห้องคอมพิวเตอร์", "Ludovic Delot", "a-classroom-with-rows-of-computers-and-monitors-18471480"],
    ["ห้องบรรยาย", "Pixabay", "brown-and-black-wooden-chairs-inside-room-207691"],
    ["เครื่องฉายภาพ", "Jens Mahnke", "a-white-projector-6062806"],
  ];
  return <main className="photo-credits">
    <Link href="/resources">← กลับไปดูห้องและอุปกรณ์</Link>
    <h1>เครดิตภาพ</h1>
    <p>ภาพประกอบจาก Pexels ไม่ใช่ภาพสถานที่หรืออุปกรณ์จริงของมหาวิทยาลัย</p>
    <ul>{photos.map(([title, author, slug]) => <li key={slug}>{title} — <a href={`https://www.pexels.com/photo/${slug}/`}>{author} / Pexels</a></li>)}</ul>
    <a href="https://www.pexels.com/license/">Pexels License</a>
  </main>;
}
