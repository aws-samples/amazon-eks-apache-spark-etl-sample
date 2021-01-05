name := "eks-spark-benchmark"

version := "3.0.1"

scalaVersion := "2.12.12"

javacOptions ++= Seq("-source", "1.11", "-target", "1.11")

// Dependencies required for this project
libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core" % "3.0.1" % "provided",
  "org.apache.spark" %% "spark-sql" % "3.0.1" % "provided",
  "org.apache.hadoop" % "hadoop-aws" % "3.2.0",
  "com.amazonaws" % "aws-java-sdk" % "1.11.375",
  // JSON serialization
  "org.json4s" %% "json4s-native" % "3.6.7",
  // scala logging
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.0"
)


assemblyShadeRules in assembly := Seq(
  ShadeRule.rename("javax.xml.stream.**" -> "shaded-javax.xml.stream.@1").inLibrary("javax.xml.stream" % "stax-api" % "1.0-2"),
  ShadeRule.rename("com.amazonaws.**" -> "shaded-com.amazonaws.@1").inLibrary("com.amazonaws" % "aws-java-sdk-bundle" % "1.11.375"),
  ShadeRule.rename("*" -> "shaded-@1").inLibrary("com.fasterxml.jackson.core" % "jackson-core" % "2.10.0"),
  ShadeRule.rename("*" -> "shaded2-@1").inLibrary("com.fasterxml.jackson.core" % "jackson-databind" % "2.10.0"),
  ShadeRule.rename("mozilla.**" -> "shaded-mozilla.@1").inLibrary("com.amazonaws" % "aws-java-sdk-bundle" % "1.11.375"),
)

// Remove stub classes
assemblyMergeStrategy in assembly := {
  case PathList("org", "apache", "spark", "unused", "UnusedStubClass.class") => MergeStrategy.discard
  case x if x.contains("io.netty.versions.properties") => MergeStrategy.discard
  case x =>
    val oldStrategy = (assemblyMergeStrategy in assembly).value
    oldStrategy(x)
}

// Exclude the Scala runtime jars
assemblyOption in assembly := (assemblyOption in assembly).value.copy(includeScala = false)
