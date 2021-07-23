name := "spark-eks"

version := "3.1.2"

scalaVersion := "2.12.14"

mainClass in assembly := Some("ValueZones.Main")

// additional librairies
libraryDependencies ++= {
  Seq(
    "org.apache.spark" %% "spark-core" % "3.1.2" % "provided",
    "org.apache.spark" %% "spark-sql" % "3.1.2" % "provided",
    "org.apache.spark" %% "spark-hive" % "3.1.2" % "provided",
    "org.scalactic" %% "scalactic" % "3.1.4",
    "org.scalatest" %% "scalatest" % "3.1.4" % Test
  )
}

assemblyShadeRules in assembly := Seq(
  ShadeRule.rename("javax.xml.stream.**" -> "shaded-javax.xml.stream.@1").inLibrary("javax.xml.stream" % "stax-api" % "1.0-2"),
  ShadeRule.rename("com.amazonaws.**" -> "shaded-com.amazonaws.@1").inLibrary("com.amazonaws" % "aws-java-sdk-bundle" % "1.11.375"),
  ShadeRule.rename("*" -> "shaded-@1").inLibrary("com.fasterxml.jackson.core" % "jackson-core" % "2.10.0"),
  ShadeRule.rename("*" -> "shaded2-@1").inLibrary("com.fasterxml.jackson.core" % "jackson-databind" % "2.10.0"),
  ShadeRule.rename("mozilla.**" -> "shaded-mozilla.@1").inLibrary("com.amazonaws" % "aws-java-sdk-bundle" % "1.11.375"),
)

assemblyMergeStrategy in assembly := {
  case "mime.types" => MergeStrategy.rename
  case x if x.contains("versions.properties") => MergeStrategy.rename
  case x =>
    val oldStrategy = (assemblyMergeStrategy in assembly).value
    oldStrategy(x)
}

// testing configuration
fork in Test := true
javaOptions ++= Seq("-Xms512M", "-Xmx2048M")
parallelExecution in Test := false